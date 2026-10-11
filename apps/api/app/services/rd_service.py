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

PROJECT_HELIX_SPEC: Dict[str, Any] = {
    "id": "project_helix",
    "name": "PROJECT HELIX",
    "subtitle": "Next-generation process intelligence & automated synthesis platform",
    "briefing": (
        "The R&D team proposes an initial capital commitment to Project Helix. "
        "The initiative could improve operational efficiency and long-term innovation capacity "
        "over future quarters, but its commercialization is uncertain. "
        "Funding the project will reduce available liquidity and prevent that cash from being deployed elsewhere. "
        "Declining preserves capital for other priorities but foregoes a potential technological leap."
    ),
    "cost_cash": 25000.0,
    "options": [
        {
            "id": "invest",
            "title": "OPTION A — INVEST IN PROJECT HELIX",
            "action_label": "INVEST",
            "cost_cash": 25000.0,
            "description": "Commit ₹25,000 corporate capital to fund the initial Phase 1 engineering pipeline for Project Helix.",
            "tradeoff": "Immediate ₹25,000 cash reduction. Enhances innovation capability and technical prestige at the cost of short-term liquidity reserves.",
            "stat_deltas": {
                "innovation": 6.0,
                "risk": 2.0,
                "board_confidence": 2.0,
            },
            "press_headline": "{company} COMMITS CAPITAL TO PROJECT HELIX AMID UNCERTAIN INNOVATION OUTLOOK",
            "press_body": "In a decisive strategic directive, {company} greenlit Phase 1 capital expenditure for Project Helix, prioritizing next-gen process intelligence despite macroeconomic headwinds.",
        },
        {
            "id": "decline",
            "title": "OPTION B — DECLINE PROJECT HELIX",
            "action_label": "DON'T INVEST",
            "cost_cash": 0.0,
            "description": "Decline the Project Helix research proposal to preserve pristine liquid treasury reserves.",
            "tradeoff": "Preserves available cash and shields the balance sheet from speculative research risk, but surrenders immediate technological advantage.",
            "stat_deltas": {
                "innovation": 0.0,
                "risk": -1.0,
                "board_confidence": 0.0,
            },
            "press_headline": "{company} PRESERVES LIQUIDITY AS RESEARCH PROPOSAL IS DEFERRED",
            "press_body": "{company} leadership has formally rejected the Project Helix funding mandate, prioritizing treasury discipline and liquid balance sheet reserves.",
        },
    ],
}


async def get_helix_proposal(company: Company, state: CompanyStateModel) -> Dict[str, Any]:
    """Returns the Project Helix proposal data along with affordability checks based on current cash."""
    cost = float(PROJECT_HELIX_SPEC["cost_cash"])
    current_cash = float(state.cash)
    can_afford = current_cash >= cost

    return {
        "project": PROJECT_HELIX_SPEC,
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
    Executes the Project Helix decision:
    - Enforces idempotency (cannot commit twice in the same quarter)
    - Validates affordability
    - Updates bounded CompanyState
    - Writes DecisionLog entry
    - Weaves story into CorporateTimesIssue
    """
    selected_option = next(
        (opt for opt in PROJECT_HELIX_SPEC["options"] if opt["id"] == option_id),
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
    if cost > 0 and float(state.cash) < cost:
        raise ValueError("Insufficient cash reserves to fund Project Helix.")

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
    if issue:
        events = list(issue.market_events) if isinstance(issue.market_events, list) else []
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
