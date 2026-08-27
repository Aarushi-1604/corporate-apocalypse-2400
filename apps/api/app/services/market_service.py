import random

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, CompanyState as CompanyStateModel, MarketSnapshot

BASELINES = {
    "oil_price": 70.0,
    "interest_rate": 4.0,
    "inflation":3.0,
    "commodity_index": 100.0,
    "currency_index": 100.0,
}
VOLATILITY = {
    "oil_price": 4.0,
    "interest_rate": 0.4,
    "inflation": 0.5,
    "commodity_index": 5.0,
    "currency_index": 3.0,
}
BOUNDS = {
    "oil_price": (20.0, 200.0),
    "interest_rate": (0.0, 15.0),
    "inflation": (-2.0, 20.0),
    "commodity_index": (50.0, 200.0),
    "currency_index": (50.0, 150.0),
}
REVERSION_RATE = 0.15

def _next_value(metric: str, previous: float, rng: random.Random) -> float:
    baseline = BASELINES[metric]
    volatility = VOLATILITY[metric]
    low, high = BOUNDS[metric]

    step = rng.uniform(-volatility, volatility)
    reversion = (baseline - previous) * REVERSION_RATE
    new_value = previous + step + reversion

    return max(low, min(high, new_value))


async def get_or_create_snapshot(
    db: AsyncSession, session_id, quarter: int
) -> MarketSnapshot:
    result = await db.execute(
        select(MarketSnapshot).where(
            MarketSnapshot.session_id == session_id, MarketSnapshot.quarter == quarter
        )
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    prev_result = await db.execute(
        select(MarketSnapshot)
        .where(MarketSnapshot.session_id == session_id, MarketSnapshot.quarter == quarter - 1)
    )
    previous = prev_result.scalar_one_or_none()

    rng = random.Random(hash((str(session_id), quarter)) % (2**31))

    if previous is None:
        new_snapshot = MarketSnapshot(
            session_id=session_id, quarter=quarter,
            oil_price=BASELINES["oil_price"], interest_rate=BASELINES["interest_rate"],
            inflation=BASELINES["inflation"], commodity_index=BASELINES["commodity_index"],
            currency_index=BASELINES["currency_index"],
        )
    else:
        new_snapshot = MarketSnapshot(
            session_id=session_id, quarter=quarter,
            oil_price=_next_value("oil_price", float(previous.oil_price), rng),
            interest_rate=_next_value("interest_rate", float(previous.interest_rate), rng),
            inflation=_next_value("inflation", float(previous.inflation), rng),
            commodity_index=_next_value("commodity_index", float(previous.commodity_index), rng),
            currency_index=_next_value("currency_index", float(previous.currency_index), rng),
        )

    db.add(new_snapshot)
    await db.commit()
    await db.refresh(new_snapshot)
    return new_snapshot


async def get_competitors(db: AsyncSession, company: Company, limit: int = 5) -> list[dict]:
    latest_quarter_subq = (
        select(func.max(CompanyStateModel.quarter))
        .where(CompanyStateModel.company_id == Company.id)
        .correlate(Company)
        .scalar_subquery()
    )

    result = await db.execute(
        select(Company.name, Company.sector, CompanyStateModel.market_share)
        .join(CompanyStateModel, CompanyStateModel.company_id == Company.id)
        .where(
            Company.id != company.id,
            CompanyStateModel.quarter == latest_quarter_subq,
        )
        .order_by(CompanyStateModel.market_share.desc())
        .limit(limit)
    )

    return [
        {"name": row.name, "sector": row.sector, "market_share": float(row.market_share)}
        for row in result.all()
    ]


def build_news(current: MarketSnapshot, previous: MarketSnapshot | None) -> list[str]:
    if previous is None:
        return ["Markets open steady this quarter -- analysts see no major early signals."]

    news = []
    oil_delta = float(current.oil_price) - float(previous.oil_price)
    if abs(oil_delta) > 3:
        news.append(
            f"Oil prices {'climbed' if oil_delta > 0 else 'eased'} sharply this quarter."
        )
    rate_delta = float(current.interest_rate) - float(previous.interest_rate)
    if abs(rate_delta) > 0.3:
        news.append(
            f"Interest rates {'tightened' if rate_delta > 0 else 'loosened'}, reshaping borrowing costs sector-wide."
        )
    inflation_delta = float(current.inflation) - float(previous.inflation)
    if abs(inflation_delta) > 0.4:
        news.append(
            f"Inflation {'accelerated' if inflation_delta > 0 else 'cooled'}, squeezing operating margins broadly."
        )
    if not news:
        news.append("A quiet quarter across the major indicators.")
    return news
