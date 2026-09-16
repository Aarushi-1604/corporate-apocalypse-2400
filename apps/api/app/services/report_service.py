from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BoardSession, Company, CompanyState as CompanyStateModel
from app.models import CorporateTimesIssue, MarketSnapshot, QuarterReport
from app.schemas.reports import CorporateTimesOut, QuarterReportOut
from app.services.market_service import build_news


def generate_narrative(deltas: dict[str, float]) -> str:
    """
    Template-based, not LLM-generated (that's a later AI-system phase).
    Picks the single biggest-magnitude delta and frames one sentence
    around it, then a generic closer. Simple on purpose -- proves the
    report pipeline works before any AI polish gets layered on top.
    """
    if not deltas:
        return "A quiet quarter, with no major decisions on record."

    biggest_metric = max(deltas, key=lambda k: abs(deltas[k]))
    biggest_value = deltas[biggest_metric]
    direction = "rose" if biggest_value > 0 else "fell"
    label = biggest_metric.replace("_", " ")

    return (
        f"This quarter was defined by a notable shift in {label}, which {direction} "
        f"by roughly {abs(biggest_value):.1f}. Leadership's decisions this quarter "
        f"left a clear mark on the company's overall trajectory."
    )


async def get_quarter_report(
    db: AsyncSession, company: Company, quarter: int
) -> QuarterReportOut | None:
    result = await db.execute(
        select(QuarterReport).where(
            QuarterReport.company_id == company.id, QuarterReport.quarter == quarter
        )
    )
    report = result.scalar_one_or_none()
    if report is None:
        return None
    return QuarterReportOut(quarter=report.quarter, kpi_deltas=report.kpi_deltas, narrative=report.narrative)


async def get_or_create_corporate_times(
    db: AsyncSession, session_id, quarter: int
) -> CorporateTimesOut:
    result = await db.execute(
        select(CorporateTimesIssue).where(
            CorporateTimesIssue.session_id == session_id, CorporateTimesIssue.quarter == quarter
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return CorporateTimesOut(
            quarter=existing.quarter, top_companies=existing.top_companies,
            biggest_failures=existing.biggest_failures, market_events=existing.market_events,
            board_gossip=existing.board_gossip, economic_outlook=existing.economic_outlook,
        )

    from sqlalchemy import func

    latest_quarter_subq = (
        select(func.max(CompanyStateModel.quarter))
        .where(CompanyStateModel.company_id == Company.id)
        .correlate(Company)
        .scalar_subquery()
    )

    top_result = await db.execute(
        select(Company.name, Company.sector, CompanyStateModel.revenue)
        .join(CompanyStateModel, CompanyStateModel.company_id == Company.id)
        .where(CompanyStateModel.quarter == latest_quarter_subq)
        .order_by(CompanyStateModel.revenue.desc())
        .limit(3)
    )
    top_companies = [
        {"name": r.name, "sector": r.sector, "revenue": float(r.revenue)} for r in top_result.all()
    ]

    fail_result = await db.execute(
        select(Company.name, Company.sector, CompanyStateModel.profit)
        .join(CompanyStateModel, CompanyStateModel.company_id == Company.id)
        .where(CompanyStateModel.quarter == latest_quarter_subq)
        .order_by(CompanyStateModel.profit.asc())
        .limit(3)
    )
    biggest_failures = [
        {"name": r.name, "sector": r.sector, "profit": float(r.profit)} for r in fail_result.all()
    ]

    gossip_result = await db.execute(
        select(Company.name).join(BoardSession, BoardSession.company_id == Company.id).where(
            BoardSession.outcome == "fired", BoardSession.quarter == quarter
        ).limit(3)
    )
    board_gossip = [f"{r.name}'s CEO was removed by the board this quarter." for r in gossip_result.all()]
    if not board_gossip:
        board_gossip = ["No boardroom shakeups reported this quarter."]

    snap_result = await db.execute(
        select(MarketSnapshot).where(MarketSnapshot.session_id == session_id, MarketSnapshot.quarter == quarter)
    )
    current_snap = snap_result.scalar_one_or_none()
    prev_result = await db.execute(
        select(MarketSnapshot).where(MarketSnapshot.session_id == session_id, MarketSnapshot.quarter == quarter - 1)
    )
    prev_snap = prev_result.scalar_one_or_none()
    market_events = build_news(current_snap, prev_snap) if current_snap else ["Markets were quiet this quarter."]

    inflation = float(current_snap.inflation) if current_snap else 3.0
    outlook = (
        "Analysts warn of continued inflationary pressure ahead."
        if inflation > 4
        else "Analysts describe the broader economic outlook as stable."
    )

    issue = CorporateTimesIssue(
        session_id=session_id, quarter=quarter, top_companies=top_companies,
        biggest_failures=biggest_failures, market_events=market_events,
        board_gossip=board_gossip, economic_outlook=outlook,
    )
    db.add(issue)
    await db.commit()

    return CorporateTimesOut(
        quarter=quarter, top_companies=top_companies, biggest_failures=biggest_failures,
        market_events=market_events, board_gossip=board_gossip, economic_outlook=outlook,
    )