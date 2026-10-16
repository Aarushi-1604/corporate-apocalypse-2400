"""
Authoritative Global Solvency & Bankruptcy Enforcement Service
Corporate Apocalypse 2400 -- SymbITech 2026 Production Hotfix

Centralizes authoritative solvency verification and terminal bankruptcy handling:
- Market & Strategic Marketing expenditures
- Client World Reimbursements, Refunds & SLA Restitutions
- Operations Budget Locking & Capital Allocations
- Research & Development (R&D) Commitments
- Board Directives & Mandatory Financial Obligations

INVARIANTS:
1. Liquid cash is determined from persisted backend state, not frontend display.
2. If committed action cash obligation exceeds available cash:
   - Rejected as an executable transaction (no deduction applied; cash stays non-negative).
   - Session status atomically transitions to 'bankrupt'.
   - Final score and Leaderboard entry are persisted idempotently via finalize_game.
   - Terminal Annual Report data is persisted.
   - Active session is terminated.
   - Returns structured bankruptcy payload to drive dedicated frontend bankruptcy screen.
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Company,
    CompanyState as CompanyStateModel,
    CorporateTimesIssue,
    DecisionLog,
    Leaderboard,
    QuarterReport,
    Session as SessionModel,
)
import app.services.scoring_service as scoring_service

async def finalize_game(db: AsyncSession, company: Company) -> None:
    await scoring_service.finalize_game(db, company)


@dataclass
class SolvencyResult:
    is_solvent: bool
    is_bankrupt: bool
    available_cash: float
    required_cash: float
    current_state: Optional[CompanyStateModel] = None
    final_score: Optional[float] = None
    action_label: str = ""
    press_headline: Optional[str] = None
    press_body: Optional[str] = None


async def enforce_solvency(
    db: AsyncSession,
    session_row: SessionModel,
    company: Company,
    quarter: int,
    action_type: str,
    action_label: str,
    required_cash: float,
    state: Optional[CompanyStateModel] = None,
) -> SolvencyResult:
    """
    Authoritative global solvency check.
    Returns SolvencyResult.
    If required_cash > available_cash:
      - Does NOT execute or deduct the unaffordable amount
      - Sets session status to 'bankrupt', current_stage to 'report', ended_at to now
      - Idempotently calls finalize_game() to persist leaderboard score
      - Adds insolvency DecisionLog and QuarterReport if needed
      - Commits transaction
      - Returns SolvencyResult with is_solvent=False, is_bankrupt=True
    """
    # 1. Check if session was already terminated
    if session_row.status == "bankrupt":
        lb_res = await db.execute(
            select(Leaderboard).where(Leaderboard.session_id == company.session_id)
        )
        lb_row = lb_res.scalar_one_or_none()
        final_score = (
            float(getattr(lb_row, "final_score", 0.0))
            if lb_row and getattr(lb_row, "final_score", None) is not None
            else 0.0
        )
        avail_cash = float(state.cash) if state else 0.0
        return SolvencyResult(
            is_solvent=False,
            is_bankrupt=True,
            available_cash=avail_cash,
            required_cash=required_cash,
            current_state=state,
            final_score=final_score,
            action_label=action_label,
            press_headline=f"INSOLVENCY DEFAULT: {company.name.upper()} BANKRUPT",
            press_body="Corporate operations remain terminated following insolvency default.",
        )

    # 2. Retrieve state if not passed, applying row lock where supported
    if state is None:
        state_res = await db.execute(
            select(CompanyStateModel)
            .where(
                CompanyStateModel.company_id == company.id,
                CompanyStateModel.quarter == quarter,
            )
            .with_for_update()
        )
        current_state = state_res.scalar_one_or_none()
    else:
        current_state = state

    if not current_state:
        state_res = await db.execute(
            select(CompanyStateModel)
            .where(CompanyStateModel.company_id == company.id)
            .order_by(CompanyStateModel.quarter.desc())
        )
        current_state = state_res.scalars().first()

    available_cash = float(current_state.cash) if current_state else 0.0
    req_cash = float(required_cash)

    # 3. Solvency evaluation: required cash exceeding available liquid cash triggers bankruptcy
    if req_cash <= available_cash:
        return SolvencyResult(
            is_solvent=True,
            is_bankrupt=False,
            available_cash=available_cash,
            required_cash=req_cash,
            current_state=current_state,
            action_label=action_label,
        )

    # 4. Insolvency Rule Triggered:
    # Do NOT execute the transaction; do NOT deduct cash (cash remains at available_cash).
    session_row.status = "bankrupt"
    session_row.ended_at = datetime.now(timezone.utc)
    session_row.current_stage = "report"

    headline = f"INSOLVENCY DEFAULT: {company.name.upper()} DECLARES BANKRUPTCY IN Q{quarter}"
    body = (
        f"{company.name} attempted {action_label} requiring ₹{req_cash:,.0f}, "
        f"exceeding available liquid reserves of ₹{available_cash:,.0f}. "
        f"Operations terminated under emergency insolvency proceedings."
    )

    # Persist DecisionLog for insolvency default
    db.add(
        DecisionLog(
            company_id=company.id,
            quarter=quarter,
            decision_type=f"{action_type}_insolvency" if action_type else "insolvency_default",
            summary=f"{action_label}: {headline}",
            stat_deltas={
                "cash": 0.0,
                "insolvent": 1.0,
                "required_amount": req_cash,
                "available_cash": available_cash,
            },
        )
    )

    # Ensure QuarterReport narrative is recorded for terminal report
    existing_qr_res = await db.execute(
        select(QuarterReport).where(
            QuarterReport.company_id == company.id,
            QuarterReport.quarter == quarter,
        )
    )
    if not existing_qr_res.scalar_one_or_none():
        db.add(
            QuarterReport(
                company_id=company.id,
                quarter=quarter,
                kpi_deltas={"cash": 0.0, "insolvent": 1.0},
                narrative=body,
            )
        )

    # Weave into CorporateTimes issue if present
    issue_result = await db.execute(
        select(CorporateTimesIssue).where(
            CorporateTimesIssue.session_id == session_row.id,
            CorporateTimesIssue.quarter == quarter,
        )
    )
    issue = issue_result.scalar_one_or_none()
    if issue and isinstance(getattr(issue, "market_events", None), list):
        events = list(issue.market_events)
        events.append(f"BREAKING: {headline} - {body}")
        issue.market_events = events

    # Finalize scoring and leaderboard entry exactly once
    await finalize_game(db, company)

    await db.commit()
    await db.refresh(session_row)
    if current_state:
        await db.refresh(current_state)

    lb_res = await db.execute(
        select(Leaderboard).where(Leaderboard.session_id == company.session_id)
    )
    lb_row = lb_res.scalar_one_or_none()
    final_score = (
        float(getattr(lb_row, "final_score", 0.0))
        if lb_row and getattr(lb_row, "final_score", None) is not None
        else 0.0
    )

    return SolvencyResult(
        is_solvent=False,
        is_bankrupt=True,
        available_cash=available_cash,
        required_cash=req_cash,
        current_state=current_state,
        final_score=final_score,
        action_label=action_label,
        press_headline=headline,
        press_body=body,
    )
