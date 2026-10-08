import uuid
from typing import List, Optional
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
    player_market_share: float
    company_name: str
    company_cash: float
    company_brand: float
    company_debt: float
    news: list[str]

# -----------------------------------------------------------------------------
# Market Cascade Training Schemas
# -----------------------------------------------------------------------------
class ScenarioCardOut(BaseModel):
    id: str
    text: str
    badge: str

class MarketScenarioOut(BaseModel):
    id: str
    title: str
    code: str
    shock_name: str
    shock_value: str
    shock_description: str
    cards: list[ScenarioCardOut]

class EvaluateCascadeRequest(BaseModel):
    scenario_id: str
    submitted_order: list[str]

class PositionCheckOut(BaseModel):
    card_id: str
    submitted_position: int
    ideal_position: int
    status: str

class EvaluateCascadeResponse(BaseModel):
    scenario_id: str
    score: int
    passed: bool
    exact_matches: int
    satisfied_pairs: int
    total_pairs: int
    position_results: list[PositionCheckOut]
    correct_order: list[str]
    explanations: dict[str, str]

# -----------------------------------------------------------------------------
# Strategic Marketing Decision Schemas
# -----------------------------------------------------------------------------
class DecisionOptionOut(BaseModel):
    id: str
    title: str
    tagline: str
    description: str
    tradeoff: str
    cost_cash: float
    stat_deltas: dict[str, float]

class StrategicDilemmaOut(BaseModel):
    id: str
    headline: str
    context_brief: str
    options: list[DecisionOptionOut]

class ExecuteMarketDecisionRequest(BaseModel):
    quarter: int
    dilemma_id: str
    option_id: str

class ExecuteMarketDecisionResponse(BaseModel):
    status: str
    option_id: str
    option_title: str
    summary: str
    cost_cash: float
    stat_deltas: dict[str, float]
    press_headline: str
    press_body: str
    new_cash: float
    new_market_share: float
    new_brand: float
    new_risk: float