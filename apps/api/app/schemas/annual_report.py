from pydantic import BaseModel


class QuarterHistoryEntry(BaseModel):
    quarter: int
    revenue: float
    profit: float
    stock_price: float


class NarrativeEntry(BaseModel):
    quarter: int
    narrative: str


class AnnualReportOut(BaseModel):
    outcome: str
    final_score: float
    revenue_score: float
    profit_score: float
    satisfaction_score: float
    innovation_score: float
    investor_score: float
    survival_score: float
    risk_penalty: float
    history: list[QuarterHistoryEntry]
    narratives: list[NarrativeEntry]