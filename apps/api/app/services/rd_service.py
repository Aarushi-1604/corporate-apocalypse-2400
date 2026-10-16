"""
R&D Department Service -- Project Genesis
Handles CTO proposals, economic feasibility checks, Project Helix decision execution,
idempotent DecisionLog persistence, and Corporate Times integration.
"""

from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Company,
    CompanyState as CompanyStateModel,
    DecisionLog,
    CorporateTimesIssue,
    Session as SessionModel,
)

from app.services.rd_templates import build_sector_rd_spec

# Kept for backward compatibility with existing tests
PROJECT_HELIX_SPEC: Dict[str, Any] = build_sector_rd_spec("General", 100000.0, 42)
PROJECT_HELIX_SPEC["id"] = "project_helix"
PROJECT_HELIX_SPEC["cost_cash"] = 25000.0
for opt in PROJECT_HELIX_SPEC["options"]:
    if opt["id"] == "invest":
        opt["cost_cash"] = 25000.0
        opt["stat_deltas"]["innovation"] = 6.0
    elif opt["id"] == "decline":
        opt["cost_cash"] = 0.0
        opt["stat_deltas"]["innovation"] = 0.0


def _get_project_spec_for_company(company: Company, current_cash: float, quarter: int = 1) -> Dict[str, Any]:
    """Generates the deterministic sector-specific R&D project spec for the given company and quarter."""
    seed = (company.id.int % (2**31)) + quarter
    return build_sector_rd_spec(company.sector, current_cash, seed)


async def get_helix_proposal(company: Company, state: CompanyStateModel) -> Dict[str, Any]:
    """Returns the sector-specific R&D proposal data along with affordability checks based on current cash."""
    current_cash = float(state.cash)
    project_spec = _get_project_spec_for_company(company, current_cash, state.quarter)
    cost = float(project_spec["cost_cash"])
    can_afford = current_cash >= cost

    return {
        "project": project_spec,
        "company_cash": current_cash,
        "cost_cash": cost,
        "can_afford": can_afford,
        "remaining_if_invested": max(0.0, current_cash - cost),
    }


async def execute_rd_decision(
    db: AsyncSession,
    company: Company,
    session_row: SessionModel,
    state: CompanyStateModel,
    quarter: int,
    option_id: str,
) -> Dict[str, Any]:
    """
    Executes the dynamic R&D decision:
    - Enforces idempotency (cannot commit twice in the same quarter)
    - Validates affordability
    - Updates bounded CompanyState
    - Writes DecisionLog entry
    - Weaves story into CorporateTimesIssue
    """
    project_spec = _get_project_spec_for_company(company, float(state.cash), quarter)
    selected_option = next(
        (opt for opt in project_spec["options"] if opt["id"] == option_id),
        None,
    )
    if not selected_option:
        raise ValueError(f"Invalid option_id: {option_id}")

    # Check for existing decision in current quarter
    existing_log_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["rd", "research_development"]),
        )
    )
    already = existing_log_res.scalar_one_or_none()
    if already is not None:
        return {
            "status": "already_committed",
            "option_id": option_id,
            "option_title": selected_option["title"],
            "action_label": selected_option["action_label"],
            "summary": already.summary,
            "cost_cash": float(selected_option["cost_cash"]),
            "stat_deltas": already.stat_deltas if isinstance(already.stat_deltas, dict) else {},
            "press_headline": selected_option["press_headline"].format(company=company.name),
            "press_body": selected_option["press_body"].format(company=company.name),
            "new_cash": float(state.cash),
            "new_innovation": float(state.innovation),
            "new_risk": float(state.risk),
            "new_board_confidence": float(state.board_confidence),
        }

    cost = float(selected_option["cost_cash"])
    from app.services.solvency_service import enforce_solvency
    solvency = await enforce_solvency(
        db=db,
        session_row=session_row,
        company=company,
        quarter=quarter,
        action_type="rd",
        action_label=f"R&D: '{selected_option['action_label']}' ({project_spec['name']})",
        required_cash=cost,
        state=state,
    )
    if solvency.is_bankrupt:
        return {
            "status": "bankrupt",
            "option_id": selected_option["id"],
            "option_title": selected_option["title"],
            "action_label": selected_option["action_label"],
            "summary": f"Insolvency default: Required ₹{cost:,.0f} exceeds available liquid cash of ₹{solvency.available_cash:,.0f}.",
            "cost_cash": 0.0,
            "stat_deltas": {"cash": 0.0, "insolvent": 1.0},
            "press_headline": solvency.press_headline or f"R&D INSOLVENCY: {company.name} DECLARES BANKRUPTCY",
            "press_body": solvency.press_body or f"{company.name} attempted '{project_spec['name']}' requiring ₹{cost:,.0f}, exceeding available liquid cash of ₹{solvency.available_cash:,.0f}.",
            "new_cash": solvency.available_cash,
            "new_innovation": float(state.innovation),
            "new_risk": float(state.risk),
            "new_board_confidence": float(state.board_confidence),
            "bankruptcy": True,
            "action_attempted": f"R&D: '{selected_option['action_label']}' ({project_spec['name']})",
            "required_amount": cost,
            "available_cash": solvency.available_cash,
            "final_score": solvency.final_score,
        }

    # Apply state deltas
    deltas = dict(selected_option["stat_deltas"])
    deltas["cash"] = -cost

    state.cash = float(state.cash) - cost

    for k, v in selected_option["stat_deltas"].items():
        if hasattr(state, k):
            current_val = float(getattr(state, k))
            new_val = current_val + v
            # Clamp bounded metrics (0 to 100)
            if k in [
                "innovation", "risk", "brand", "market_share",
                "client_satisfaction", "employee_satisfaction",
                "investor_confidence", "board_confidence", "esg",
            ]:
                new_val = max(0.0, min(100.0, new_val))
            setattr(state, k, new_val)

    press_headline = selected_option["press_headline"].format(company=company.name)
    press_body = selected_option["press_body"].format(company=company.name)

    # Record into DecisionLog
    log_entry = DecisionLog(
        company_id=company.id,
        quarter=quarter,
        decision_type="rd",
        summary=f"{selected_option['action_label']}: {press_headline}",
        stat_deltas=deltas,
    )
    db.add(log_entry)

    # Weave into Corporate Times issue
    issue_result = await db.execute(
        select(CorporateTimesIssue).where(
            CorporateTimesIssue.session_id == session_row.id,
            CorporateTimesIssue.quarter == quarter,
        )
    )
    issue = issue_result.scalar_one_or_none()
    if issue and isinstance(getattr(issue, "market_events", None), list):
        events = list(issue.market_events)
        events.append(f"RESEARCH DISPATCH: {press_headline} - {press_body}")
        issue.market_events = events

    await db.commit()
    await db.refresh(state)

    return {
        "status": "committed",
        "option_id": selected_option["id"],
        "option_title": selected_option["title"],
        "action_label": selected_option["action_label"],
        "summary": log_entry.summary,
        "cost_cash": cost,
        "stat_deltas": deltas,
        "press_headline": press_headline,
        "press_body": press_body,
        "new_cash": float(state.cash),
        "new_innovation": float(state.innovation),
        "new_risk": float(state.risk),
        "new_board_confidence": float(state.board_confidence),
    }
