import uuid
from typing import Literal

from pydantic import BaseModel, Field

ClientType = Literal["enterprise", "government", "international"]
ContractAction = Literal["accept", "decline"]


class ContractOut(BaseModel):
    id: uuid.UUID
    client_name: str
    client_type: ClientType
    status: str
    value: float
    relationship_score: float


class NegotiateRequest(BaseModel):
    position: float = Field(ge=0, le=100)


class DecisionRequest(BaseModel):
    action: ContractAction
    position: float = Field(ge=0, le=100, default=50)


class DecisionResponse(BaseModel):
    status: str
    stat_deltas: dict[str, float]