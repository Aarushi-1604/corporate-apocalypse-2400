import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    BoardExchange,
    BoardSession,
    Company,
    CompanyState as CompanyStateModel,
    Contract,
    CorporateTimesIssue,
    DecisionLog,
    Leaderboard,
    Player,
    QuarterReport,
    Session as SessionModel,
)
from app.schemas.annual_report import (
    AnnualReportOut,
    ClientDealSummaryEntry,
    DecisionSummaryEntry,
    NarrativeEntry,
    PressHeadlineEntry,
    QuarterHistoryEntry,
    ScoreBreakdown,
)
from app.services.scoring_service import finalize_game


async def get_annual_report(db: AsyncSession, company: Company) -> AnnualReportOut:
    session_result = await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
    session_row = session_result.scalar_one()

    # If session is active, check if it reached terminal conditions (Q4 complete or bankruptcy)
    if session_row.status == "active":
        states_res = await db.execute(
            select(CompanyStateModel)
            .where(CompanyStateModel.company_id == company.id)
            .order_by(CompanyStateModel.quarter.desc())
        )
        latest_state = states_res.scalars().first()
        
        # Check if cash < 0 (bankruptcy)
        if latest_state and float(latest_state.cash) < 0:
            session_row.status = "bankrupt"
            session_row.ended_at = datetime.now(timezone.utc)
            await finalize_game(db, company)
            await db.commit()
        # Check if Q4 board completed
        elif session_row.current_quarter >= 4 or session_row.current_stage == "report":
            q4_board = await db.execute(
                select(BoardSession).where(
                    BoardSession.company_id == company.id,
                    BoardSession.quarter == 4,
                    BoardSession.ended_at.is_not(None),
                )
            )
            if q4_board.scalars().first():
                session_row.status = "completed"
                session_row.ended_at = datetime.now(timezone.utc)
                session_row.current_stage = "report"
                await finalize_game(db, company)
                await db.commit()
            else:
                raise ValueError("NOT_YET_AVAILABLE")
        else:
            raise ValueError("NOT_YET_AVAILABLE")

    if session_row.status not in ["completed", "bankrupt", "fired"]:
        raise ValueError("NOT_YET_AVAILABLE")

    # Authoritative leaderboard score row
    leaderboard_result = await db.execute(
        select(Leaderboard).where(Leaderboard.session_id == company.session_id)
    )
    score_row = leaderboard_result.scalar_one_or_none()

    if score_row is None:
        await finalize_game(db, company)
        await db.commit()
        leaderboard_result = await db.execute(
            select(Leaderboard).where(Leaderboard.session_id == company.session_id)
        )
        score_row = leaderboard_result.scalar_one_or_none()

    # Player info
    player_result = await db.execute(select(Player).where(Player.id == session_row.player_id))
    player_row = player_result.scalar_one_or_none()
    ceo_name = player_row.full_name if player_row else "Not recorded"

    # Company states
    states_result = await db.execute(
        select(CompanyStateModel)
        .where(CompanyStateModel.company_id == company.id)
        .order_by(CompanyStateModel.quarter)
    )
    all_states = states_result.scalars().all()
    
    latest_st = all_states[-1] if all_states else None
    final_cash = float(latest_st.cash) if latest_st else 0.0

    history = [
        QuarterHistoryEntry(
            quarter=s.quarter,
            revenue=float(s.revenue),
            profit=float(s.profit),
            stock_price=float(s.stock_price),
            cash=float(s.cash),
            client_satisfaction=float(s.client_satisfaction),
            employee_satisfaction=float(s.employee_satisfaction),
            innovation=float(s.innovation),
            investor_confidence=float(s.investor_confidence),
            brand=float(s.brand),
            esg=float(s.esg),
            risk=float(s.risk),
        )
        for s in all_states
    ]

    final_kpis: dict[str, float] = {}
    if latest_st:
        final_kpis = {
            "revenue": float(latest_st.revenue),
            "profit": float(latest_st.profit),
            "cash": float(latest_st.cash),
            "stock_price": float(latest_st.stock_price),
            "employees": float(latest_st.employees),
            "client_satisfaction": float(latest_st.client_satisfaction),
            "employee_satisfaction": float(latest_st.employee_satisfaction),
            "innovation": float(latest_st.innovation),
            "investor_confidence": float(latest_st.investor_confidence),
            "brand": float(latest_st.brand),
            "esg": float(latest_st.esg),
            "risk": float(latest_st.risk),
            "market_share": float(latest_st.market_share),
            "board_confidence": float(latest_st.board_confidence),
        }

    # Narratives from QuarterReport
    reports_result = await db.execute(
        select(QuarterReport)
        .where(QuarterReport.company_id == company.id)
        .order_by(QuarterReport.quarter)
    )
    narratives = [
        NarrativeEntry(quarter=r.quarter, narrative=r.narrative or "Not recorded")
        for r in reports_result.scalars().all()
    ]

    # Decisions from DecisionLog
    decisions_result = await db.execute(
        select(DecisionLog)
        .where(DecisionLog.company_id == company.id)
        .order_by(DecisionLog.quarter, DecisionLog.created_at)
    )
    decisions = [
        DecisionSummaryEntry(
            quarter=d.quarter,
            decision_type=d.decision_type or "general",
            summary=d.summary or "Not recorded",
            stat_deltas=d.stat_deltas or {},
        )
        for d in decisions_result.scalars().all()
    ]

    # Accepted deals from Contract
    contracts_result = await db.execute(
        select(Contract)
        .where(
            Contract.company_id == company.id,
            Contract.status.in_(["accepted", "remediated", "active", "completed", "disputed"]),
        )
        .order_by(Contract.quarter)
    )
    accepted_deals = [
        ClientDealSummaryEntry(
            quarter=c.quarter,
            client_name=c.client_name or "Not recorded",
            client_type=c.client_type or "standard",
            status=c.status or "active",
            value=float(c.value),
            relationship_score=float(c.relationship_score),
        )
        for c in contracts_result.scalars().all()
    ]

    # Press summaries from CorporateTimesIssue & DecisionLog
    press_summaries: list[PressHeadlineEntry] = []
    issues_result = await db.execute(
        select(CorporateTimesIssue)
        .where(CorporateTimesIssue.session_id == company.session_id)
        .order_by(CorporateTimesIssue.quarter)
    )
    for issue in issues_result.scalars().all():
        market_events = issue.market_events or {}
        event_text = market_events.get("event", "") if isinstance(market_events, dict) else ""
        rep_impact = f"Sentiment: {issue.economic_outlook}" if issue.economic_outlook else "Neutral coverage"
        press_summaries.append(
            PressHeadlineEntry(
                quarter=issue.quarter,
                headline=event_text or f"Q{issue.quarter} Corporate Times Financial Edition",
                details=issue.economic_outlook or "Global market overview recorded.",
                reputation_impact=rep_impact,
            )
        )
    
    # Also include press decisions if any
    for d in decisions:
        if d.decision_type == "press":
            press_summaries.append(
                PressHeadlineEntry(
                    quarter=d.quarter,
                    headline=d.summary,
                    details=f"Impact: {d.stat_deltas}",
                    reputation_impact=f"Brand delta: {d.stat_deltas.get('brand', 0.0):+}",
                )
            )

    # Final Board Assessment
    final_board_assessment = "Not recorded"
    latest_board_res = await db.execute(
        select(BoardSession)
        .where(BoardSession.company_id == company.id, BoardSession.ended_at.is_not(None))
        .order_by(BoardSession.quarter.desc())
    )
    latest_board = latest_board_res.scalars().first()

    if session_row.status == "fired":
        final_board_assessment = (
            "TERMINATED BY BOARD OF DIRECTORS: Executive confidence collapsed below acceptable operational thresholds. "
            "The Board exercised emergency oversight authority to terminate tenure with immediate dismissal."
        )
    elif session_row.status == "bankrupt":
        final_board_assessment = (
            "CHAPTER 11 INSOLVENCY DECLARATION: Corporate liquid cash reserves fell below zero. "
            "Operations suspended under terminal insolvency protection. Executive mandate formally terminated."
        )
    elif session_row.status == "completed":
        conf = latest_st.board_confidence if latest_st else 50.0
        final_board_assessment = (
            f"MANDATE RATIFIED: Chief Executive successfully steered {company.name} across all 4 quarters of fiscal year 2400. "
            f"Final Board confidence closed at {conf:.1f}%. Full executive tenure completed."
        )

    # Outcomes
    raw_status = session_row.status
    if raw_status == "completed":
        outcome = "SURVIVED"
    elif raw_status == "bankrupt":
        outcome = "BANKRUPT"
    elif raw_status == "fired":
        outcome = "FIRED"
    else:
        outcome = raw_status.upper()

    final_score = float(score_row.final_score) if score_row and score_row.final_score is not None else 0.0
    revenue_score = float(score_row.revenue_score) if score_row and score_row.revenue_score is not None else 0.0
    satisfaction_score = float(score_row.satisfaction_score) if score_row and score_row.satisfaction_score is not None else 0.0
    innovation_score = float(score_row.innovation_score) if score_row and score_row.innovation_score is not None else 0.0
    investor_score = float(score_row.investor_score) if score_row and score_row.investor_score is not None else 0.0
    survival_score = float(score_row.survival_score) if score_row and score_row.survival_score is not None else 0.0
    risk_penalty = float(score_row.risk_penalty) if score_row and score_row.risk_penalty is not None else 0.0
    # Profit score calculation (Leaderboard table omits profit_score column)
    avg_profit = (sum(s.profit for s in history) / len(history)) if history else 0.0
    profit_score = max(0.0, min(100.0, 50.0 + avg_profit / 50000.0))

    score_breakdown = ScoreBreakdown(
        revenue_score=revenue_score,
        profit_score=profit_score,
        satisfaction_score=satisfaction_score,
        innovation_score=innovation_score,
        investor_score=investor_score,
        survival_score=survival_score,
        risk_penalty=risk_penalty,
    )

    return AnnualReportOut(
        outcome=outcome,
        raw_status=raw_status,
        ceo_name=ceo_name,
        company_name=company.name,
        sector=company.sector,
        final_score=final_score,
        final_cash=final_cash,
        final_kpis=final_kpis,
        score_breakdown=score_breakdown,
        history=history,
        narratives=narratives,
        decisions=decisions,
        accepted_deals=accepted_deals,
        press_summaries=press_summaries,
        final_board_assessment=final_board_assessment,
        revenue_score=revenue_score,
        profit_score=profit_score,
        satisfaction_score=satisfaction_score,
        innovation_score=innovation_score,
        investor_score=investor_score,
        survival_score=survival_score,
        risk_penalty=risk_penalty,
    )