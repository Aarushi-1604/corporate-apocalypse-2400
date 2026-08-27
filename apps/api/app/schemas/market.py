import uuid

from pydantic import BaseModel

class MarketSnapshotOut(BaseModel):
    quarter: int
    oil_price: float
    interest_rate: float
    inflation: float
    commodity_index: float
    currency_index: float

class CompetitorOut(BaseModel):
    name: str
    sector: str
    market_share: float

class MarketViewOut(BaseModel):
    snapshot: MarketSnapshotOut
    competitors: list[CompetitorOut]
    news: list[str]