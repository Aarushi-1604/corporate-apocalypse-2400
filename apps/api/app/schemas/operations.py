from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.company import CompanyStateOut

CategoryName = Literal[
    "marketing", "rnd", "hiring", "layoffs", "automation", "cybersecurity",
    "legal", "supply_chain", "manufacturing", "expansion", "loans",
    "dividends", "carbon_reduction", "pricing", "acquisitions", "patents",
    "insurance",
]


class BudgetAllocationIn(BaseModel):
    category: CategoryName
    amount: float = Field(ge=0)


class BudgetSubmitRequest(BaseModel):
    quarter: int
    allocations: list[BudgetAllocationIn]


class BudgetAllocationOut(BaseModel):
    category: str
    amount: float


class BudgetDraftOut(BaseModel):
    allocations: list[BudgetAllocationOut]
    available_capital: float


class LockRequest(BaseModel):
    quarter: int


class LockResponse(BaseModel):
    new_quarter: int
    deltas: dict[str, float]
    board_session_required: bool
    bankruptcy: bool
    already_locked: bool
    new_state: CompanyStateOut
    action_attempted: str | None = None
    required_amount: float | None = None
    available_cash: float | None = None
    final_score: float | None = None