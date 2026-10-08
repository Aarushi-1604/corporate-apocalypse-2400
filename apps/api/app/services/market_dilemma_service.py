"""
Strategic marketing decision matrix & deterministic consequence engine.
Defines meaningful corporate choices, KPI deltas, DecisionLog records, and press narratives.
"""

from typing import Dict, TypedDict, List


class DecisionOption(TypedDict):
    id: str
    title: str
    tagline: str
    description: str
    tradeoff: str
    cost_cash: float
    stat_deltas: Dict[str, float]  # Applied to CompanyState (e.g. brand, market_share, risk, cash)
    press_headline: str
    press_body: str


class StrategicDilemma(TypedDict):
    id: str
    headline: str
    context_brief: str
    options: List[DecisionOption]


MARKETING_STRATEGIC_DILEMMAS: List[StrategicDilemma] = [
    {
        "id": "macro_headwind_growth",
        "headline": "COMPETITOR EXPANSION IN TIGHTENING CONDITIONS",
        "context_brief": (
            "Macroeconomic headwinds are squeezing consumer purchasing power. Simultaneously, "
            "your primary sector rival has launched an aggressive market-share offensive, offering deep discounts "
            "and outspending across media channels to capture your customer base."
        ),
        "options": [
            {
                "id": "aggressive_marketing",
                "title": "COUNTER-OFFENSIVE // HIGH-IMPACT BRAND BLITZ",
                "tagline": "Aggressive media saturation to defend mindshare and seize competitor volume.",
                "description": "Deploy heavy marketing capital into premium advertising, sponsored summits, and influencer alliances.",
                "tradeoff": "Significant liquid cash drain // Maximizes brand recognition and market share growth.",
                "cost_cash": 25000.0,
                "stat_deltas": {
                    "brand": 8.5,
                    "market_share": 2.2,
                    "risk": 3.0,
                    "client_satisfaction": 2.0,
                    "investor_confidence": 3.5,
                },
                "press_headline": "{company} UNLEASHES AGGRESSIVE EXPANSION BLITZ",
                "press_body": "{company} captured significant market mindshare after launching an ambitious nationwide marketing offensive, shaking rival territory.",
            },
            {
                "id": "price_war",
                "title": "PREDATORY PRICING // MARGIN DISRUPTION",
                "tagline": "Slash tier pricing to undercut rival contracts and drive immediate client acquisition.",
                "description": "Calibrate enterprise pricing models downwards by 15% to trigger immediate customer migrations.",
                "tradeoff": "Depresses short-term profit margins and brand prestige // Forces competitors on defense and claims market share.",
                "cost_cash": 12000.0,
                "stat_deltas": {
                    "market_share": 3.4,
                    "profit": -6000.0,
                    "brand": -2.0,
                    "client_satisfaction": 5.0,
                    "risk": 4.0,
                },
                "press_headline": "{company} TRIGGERS CUTTHROAT SECTOR PRICE WAR",
                "press_body": "By drastically lowering catalog contract rates, {company} triggered an aggressive price war across the sector, sacrificing margins for rapid market capture.",
            },
            {
                "id": "defensive_retention",
                "title": "DEFENSIVE FORTIFICATION // CLIENT RETENTION",
                "tagline": "Protect core accounts with bespoke SLA guarantees, loyalty rebates, and white-glove service.",
                "description": "Refocus resources on high-value clients to build unbreakable switching moats.",
                "tradeoff": "Modest market share growth // Deepens account loyalty and insulates against competitor raids.",
                "cost_cash": 8000.0,
                "stat_deltas": {
                    "client_satisfaction": 8.0,
                    "brand": 3.0,
                    "risk": -4.0,
                    "market_share": 0.5,
                    "board_confidence": 4.0,
                },
                "press_headline": "{company} FORTIFIES CORE CLIENT BASE AMID MARKET SHOCKS",
                "press_body": "Analysts commended {company} for strengthening key enterprise relationships and locking in multi-year service contracts despite rival hostility.",
            },
            {
                "id": "preserve_cash",
                "title": "LIQUIDITY DISCIPLINE // STRATEGIC PATIENCE",
                "tagline": "Conserve liquid balance sheet capital and wait for cash-strapped rivals to over-leverage.",
                "description": "Minimize discretionary marketing expenditures. Maintain ironclad treasury reserves to exploit future distressed competitor distress.",
                "tradeoff": "Temporary market share erosion // Preserves pristine liquid reserves for opportunistic acquisitions.",
                "cost_cash": 0.0,
                "stat_deltas": {
                    "market_share": -1.2,
                    "risk": -6.0,
                    "investor_confidence": 2.0,
                    "board_confidence": 2.0,
                },
                "press_headline": "{company} HOARDS CASH RESERVES IN DEFIANCE OF RIVAL EXPANSION",
                "press_body": "Refusing to engage in costly media skirmishes, {company} fortified its treasury, preparing for counter-cyclical opportunities as rivals burn cash.",
            },
        ],
    }
]
