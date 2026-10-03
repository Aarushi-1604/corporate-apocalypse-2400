import uuid

from pydantic import BaseModel


class LeaderboardRowOut(BaseModel):
    id: uuid.UUID
    company_name: str
    sector: str
    final_score: float
    rank: int