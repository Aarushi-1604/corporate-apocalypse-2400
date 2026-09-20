from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, CompanyState as CompanyStateModel
from app.models import Leaderboard, QuarterReport, Session as SessionModel
from app.schemas.annual_report import AnnualReportOut, NarrativeEntry, QuarterHistoryEntry


async def get_annual_report(db: AsyncSession, company: Company) -> AnnualReportOut:
    session_result = await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
    session_row = session_result.scalar_one()

    if session_row.status == "active":
        raise ValueError("NOT_YET_AVAILABLE")

    leaderboard_result = await db.execute(
        select(Leaderboard).where(Leaderboard.session_id == company.session_id)
    )
    score_row = leaderboard_result.scalar_one()

    states_result = await db.execute(
        select(CompanyStateModel)
        .where(CompanyStateModel.company_id == company.id)
        .order_by(CompanyStateModel.quarter)
    )
    history = [
        QuarterHistoryEntry(
            quarter=s.quarter, revenue=float(s.revenue),
            profit=float(s.profit), stock_price=float(s.stock_price),
        )
        for s in states_result.scalars().all()
    ]

    reports_result = await db.execute(
        select(QuarterReport)
        .where(QuarterReport.company_id == company.id)
        .order_by(QuarterReport.quarter)
    )
    narratives = [
        NarrativeEntry(quarter=r.quarter, narrative=r.narrative)
        for r in reports_result.scalars().all()
    ]

    return AnnualReportOut(
        outcome=session_row.status,
        final_score=float(score_row.final_score), revenue_score=float(score_row.revenue_score),
        profit_score=float(score_row.profit_score), satisfaction_score=float(score_row.satisfaction_score),
        innovation_score=float(score_row.innovation_score), investor_score=float(score_row.investor_score),
        survival_score=float(score_row.survival_score), risk_penalty=float(score_row.risk_penalty),
        history=history, narratives=narratives,
    )