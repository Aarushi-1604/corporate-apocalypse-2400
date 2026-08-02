from typing import Literal

from pydantic import BaseModel, Field

CategoryName = Literal[
    "marketing", "rnd", "hiring", "layoffs", "automation", "cybersecurity",
    "legal", "supply_chain", "manufacturing", "expansion", "loans",
    "dividends", "carbon_reduction", "pricing", "acquisitions", "patents",
    "insurance",
]


class CompanyState(BaseModel):
    """
    Mirrors the company_states DB table's game-relevant columns.
    This is a plain data structure -- the engine only ever works with
    this, never with a database row directly.
    """

    cash: float
    revenue: float
    profit: float
    debt: float
    stock_price: float
    employees: int
    innovation: float
    brand: float
    client_satisfaction: float
    employee_satisfaction: float
    investor_confidence: float
    esg: float
    risk: float
    market_share: float
    board_confidence: float


class Decision(BaseModel):
    category: CategoryName
    amount: float = Field(ge=0)


class MarketSnapshot(BaseModel):
    """Optional -- if not provided, macro effects are simply skipped."""

    interest_rate: float = 0.0
    inflation: float = 0.0


class CompanyTraits(BaseModel):
    """
    Optional per-company modifiers (Blueprint's unique_passive_ability).
    passive_multipliers maps a metric name to a multiplier applied to
    that metric's total delta this tick, e.g. {"esg": 1.15} means all
    ESG-affecting deltas this quarter are boosted 15%.
    """

    passive_multipliers: dict[str, float] = Field(default_factory=dict)


class TickResult(BaseModel):
    new_state: CompanyState
    deltas: dict[str, float]
    board_session_required: bool
    bankruptcy: bool