import random
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, CompanyState as CompanyStateModel, Contract, DecisionLog
from app.schemas.clients import ContractOut

MIN_DELAY_SECONDS = 30

CLIENT_NAME_POOL = [
    "Halden Industrial Group", "Ferrow & Co.", "Meridian Civic Authority",
    "Continental Freight Alliance", "Northgate Systems", "Redshaw Consortium",
    "Aldric Trade Federation", "Voss Municipal Services",
]
CLIENT_TYPE_VALUE_RANGES = {
    "enterprise": (8000, 15000),
    "government": (12000, 20000),
    "international": (15000, 25000),
}


async def _maybe_spawn_contract(db: AsyncSession, company: Company, quarter: int) -> None:
    existing = await db.execute(
        select(Contract).where(Contract.company_id == company.id, Contract.quarter == quarter)
    )
    if existing.scalar_one_or_none() is not None:
        return

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one()
    elapsed = (
        datetime.now(timezone.utc) - state.recorded_at.replace(tzinfo=timezone.utc)
    ).total_seconds()
    if elapsed < MIN_DELAY_SECONDS:
        return

    rng = random.Random(company.id.int + quarter * 104729)
    client_type = rng.choice(list(CLIENT_TYPE_VALUE_RANGES.keys()))
    low, high = CLIENT_TYPE_VALUE_RANGES[client_type]
    value = rng.uniform(low, high)
    name = rng.choice(CLIENT_NAME_POOL)

    db.add(
        Contract(
            company_id=company.id, quarter=quarter, client_name=name,
            client_type=client_type, status="incoming", value=value,
            relationship_score=50,
        )
    )
    await db.commit()


async def get_current_contract(db: AsyncSession, company: Company, quarter: int) -> ContractOut | None:
    await _maybe_spawn_contract(db, company, quarter)

    result = await db.execute(
        select(Contract).where(Contract.company_id == company.id, Contract.quarter == quarter)
    )
    contract = result.scalar_one_or_none()
    if contract is None:
        return None

    return ContractOut(
        id=contract.id, client_name=contract.client_name, client_type=contract.client_type,
        status=contract.status, value=float(contract.value),
        relationship_score=float(contract.relationship_score),
    )


async def negotiate(db: AsyncSession, contract: Contract, position: float) -> None:
    contract.status = "negotiating"
    contract.relationship_score = 50 + (position * 0.3)
    await db.commit()


BOUNDED_METRICS = ["client_satisfaction", "market_share"]


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


async def decide(
    db: AsyncSession, company: Company, quarter: int, contract: Contract, action: str, position: float
) -> dict[str, float]:
    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one()

    deltas: dict[str, float] = {}

    if action == "accept":
        price_weight = 1 - (position / 100)
        relationship_weight = position / 100

        revenue_gain = float(contract.value) * (0.5 + 0.5 * price_weight)
        satisfaction_gain = relationship_weight * 5
        deltas = {
            "revenue": revenue_gain,
            "client_satisfaction": satisfaction_gain,
            "market_share": 0.5,
        }
        contract.status = "closed_won"
        contract.relationship_score = 50 + (position * 0.3)
    else:
        deltas = {"market_share": -0.2}
        contract.status = "closed_lost"

    state.revenue = float(state.revenue) + deltas.get("revenue", 0.0)
    for metric in BOUNDED_METRICS:
        if metric in deltas:
            current = getattr(state, metric)
            setattr(state, metric, _clamp(float(current) + deltas[metric]))

    db.add(
        DecisionLog(
            company_id=company.id, quarter=quarter, decision_type="client_negotiation",
            reference_id=contract.id,
            summary=f"{action.capitalize()}ed contract with {contract.client_name}.",
            stat_deltas=deltas,
        )
    )
    await db.commit()
    return deltas