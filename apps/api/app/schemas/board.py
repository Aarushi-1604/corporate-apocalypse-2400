import uuid

from pydantic import BaseModel


class BoardOptionOut(BaseModel):
    label: str


class ActiveBoardExchangeOut(BaseModel):
    board_session_id: uuid.UUID
    exchange_id: uuid.UUID
    speaker: str
    question: str
    options: list[BoardOptionOut]
    sequence: int
    total_exchanges: int


class BoardRespondRequest(BaseModel):
    chosen_option_index: int


class BoardRespondResponse(BaseModel):
    confidence_delta: float
    session_complete: bool
    fired: bool
    new_confidence: float | None = None