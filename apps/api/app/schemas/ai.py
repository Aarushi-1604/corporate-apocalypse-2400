from pydantic import BaseModel


class AdvisorRequest(BaseModel):
    query: str


class AdvisorResponse(BaseModel):
    answer: str
    source: str
    was_blocked: bool