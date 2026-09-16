import uuid

from pydantic import BaseModel


class QuarterReportOut(BaseModel):
    quarter: int
    kpi_deltas: dict[str, float]
    narrative: str


class CorporateTimesOut(BaseModel):
    quarter: int
    top_companies: list[dict]
    biggest_failures: list[dict]
    market_events: list[str]
    board_gossip: list[str]
    economic_outlook: str