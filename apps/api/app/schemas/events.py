import uuid
from datetime import datetime

from pydantic import BaseModel


class ResponseOptionOut(BaseModel):
    label: str


class ActiveEventOut(BaseModel):
    event_instance_id: uuid.UUID
    category: str
    severity: str
    title: str
    body: str
    response_options: list[ResponseOptionOut]
    response_deadline: datetime


class RespondRequest(BaseModel):
    chosen_option_index: int


class RespondResponse(BaseModel):
    follow_up_text: str
    stat_deltas: dict[str, float]
    already_resolved: bool