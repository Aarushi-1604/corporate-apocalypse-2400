from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PressSessionOut(BaseModel):
    quarter: int
    status: str
    lock_reason: Optional[str] = None
    headline: Optional[str] = None
    context: Optional[str] = None
    established_facts: Optional[List[str]] = None
    journalist: Optional[Dict[str, str]] = None
    current_question: Optional[str] = None
    current_exchange_index: int = 0
    total_exchanges: int = 3
    statements: List[str] = []
    questions: List[str] = []
    tone: Optional[str] = None
    article_body: Optional[str] = None
    media_verdict: Optional[str] = None
    commitments: Optional[List[str]] = None
    score: Optional[int] = None
    stat_deltas: Optional[Dict[str, float]] = None


class PressRespondRequest(BaseModel):
    statement: str = Field(..., max_length=600, description="CEO statement (max 1 sentence, <= 50 words)")


class PressRespondOut(BaseModel):
    status: str
    current_exchange_index: int
    total_exchanges: int = 3
    next_question: Optional[str] = None
    tone: Optional[str] = None
    journalist_notes: Optional[str] = None
    statements: List[str] = []
    questions: List[str] = []
    headline: Optional[str] = None
    article_body: Optional[str] = None
    media_verdict: Optional[str] = None
    commitments: Optional[List[str]] = None
    score: Optional[int] = None
    stat_deltas: Optional[Dict[str, float]] = None
    new_brand: Optional[float] = None
    new_investor_confidence: Optional[float] = None
    new_risk: Optional[float] = None
    new_board_confidence: Optional[float] = None
