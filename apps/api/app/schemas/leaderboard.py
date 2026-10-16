import uuid
from pydantic import BaseModel


class LeaderboardRowOut(BaseModel):
    id: uuid.UUID
    company_name: str
    sector: str
    final_score: float
    adjusted_score: float
    raw_score: float
    rank: int
    participant_name: str = "Anonymous Executive"
    masked_prn: str | None = None
    branch: str | None = None
    status: str = "Completed Run"
    terminal_status: str = "SURVIVED"
    ending_quarter: int = 4
    terminal_reason: str = "Fiscal solvency & governance ratified"
    day_batch: int = 1
    revenue_score: float | None = None
    satisfaction_score: float | None = None
    innovation_score: float | None = None
    investor_score: float | None = None