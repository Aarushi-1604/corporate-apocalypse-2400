from typing import Any
from pydantic import BaseModel


class QuarterHistoryEntry(BaseModel):
    quarter: int
    revenue: float
    profit: float
    stock_price: float
    cash: float = 0.0
    client_satisfaction: float = 0.0
    employee_satisfaction: float = 0.0
    innovation: float = 0.0
    investor_confidence: float = 0.0
    brand: float = 0.0
    esg: float = 0.0
    risk: float = 0.0


class NarrativeEntry(BaseModel):
    quarter: int
    narrative: str


class DecisionSummaryEntry(BaseModel):
    quarter: int
    decision_type: str
    summary: str
    stat_deltas: dict[str, Any] = {}


class ClientDealSummaryEntry(BaseModel):
    quarter: int
    client_name: str
    client_type: str
    status: str
    value: float
    relationship_score: float


class PressHeadlineEntry(BaseModel):
    quarter: int
    headline: str
    details: str = ""
    reputation_impact: str = ""


class ScoreBreakdown(BaseModel):
    revenue_score: float = 0.0
    profit_score: float = 0.0
    satisfaction_score: float = 0.0
    innovation_score: float = 0.0
    investor_score: float = 0.0
    survival_score: float = 0.0
    risk_penalty: float = 0.0


class AnnualReportOut(BaseModel):
    outcome: str  # SURVIVED, BANKRUPT, FIRED
    raw_status: str  # completed, bankrupt, fired
    ending_quarter: int | None = None
    terminal_reason: str | None = None
    ceo_name: str
    company_name: str
    sector: str
    final_score: float
    final_cash: float
    final_kpis: dict[str, float]
    score_breakdown: ScoreBreakdown
    history: list[QuarterHistoryEntry]
    narratives: list[NarrativeEntry]
    decisions: list[DecisionSummaryEntry]
    accepted_deals: list[ClientDealSummaryEntry]
    press_summaries: list[PressHeadlineEntry]
    final_board_assessment: str
    # Root level backwards compatibility
    revenue_score: float
    profit_score: float
    satisfaction_score: float
    innovation_score: float
    investor_score: float
    survival_score: float
    risk_penalty: float