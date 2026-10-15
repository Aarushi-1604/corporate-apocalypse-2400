from pydantic import BaseModel


class AdvisorRequest(BaseModel):
    query: str
    screen: str | None = "default"
    context: str | None = None
    mode: str | None = "advisor"


class AdvisorResponse(BaseModel):
    answer: str
    source: str
    was_blocked: bool
    queries_remaining: int | None = None


class DictionaryRequest(BaseModel):
    query: str


class DictionaryResponse(BaseModel):
    answer: str
    source: str
    was_blocked: bool