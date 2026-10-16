import uuid
from pydantic import BaseModel


class LeaderboardRowOut(BaseModel):
    id: uuid.UUID
    company_name: str
    sector: str
    final_score: float
    rank: int
    participant_name: str = "Anonymous Executive"
    masked_prn: str | None = None
    branch: str | None = None
    status: str = "Completed Run"
    revenue_score: float | None = None
    satisfaction_score: float | None = None
    innovation_score: float | None = None
    investor_score: float | None = None