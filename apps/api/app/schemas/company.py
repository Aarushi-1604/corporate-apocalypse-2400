import uuid

from pydantic import BaseModel


class CompanyStateOut(BaseModel):
    company_id: uuid.UUID
    quarter: int
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


class DepartmentStatusOut(BaseModel):
    locked: bool
    summary: str | None = None
    detail: str | None = None
    headline: str | None = None
    press: str | None = None
    option_title: str | None = None
    stat_deltas: dict[str, float] | None = None


class DepartmentLocksOut(BaseModel):
    quarter: int
    operations: DepartmentStatusOut
    market: DepartmentStatusOut
    rd: DepartmentStatusOut
    client: DepartmentStatusOut | None = None
    press: DepartmentStatusOut | None = None


class TabletEventOut(BaseModel):
    quarter: int
    decision_type: str
    summary: str
    stat_deltas: dict[str, float] | None = None
    created_at: str


class TabletSnapshotOut(BaseModel):
    quarter: int
    player_name: str | None = None
    company_name: str
    sector: str
    session_status: str
    state: CompanyStateOut
    previous_state: CompanyStateOut | None = None
    locks: DepartmentLocksOut
    recent_events: list[TabletEventOut]