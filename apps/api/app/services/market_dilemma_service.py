"""
Strategic marketing decision matrix & deterministic consequence engine.
Defines meaningful corporate choices, KPI deltas, DecisionLog records, and press narratives.
Provides escalating difficulty across Quarters 1 to 4:
- Q1: Baseline difficulty with ₹0 / do-nothing cash preservation option.
- Q2: Sector Counter-Strike: Positive monetary commitment required across all options (no ₹0 / free skip).
- Q3: Supply & Talent Monopoly Pivot: Higher baseline costs with high-stakes systemic trade-offs.
- Q4: Terminal Market Reckoning: Highest cost pressure and toughest trade-offs of all four quarters.
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


QUARTER_MARKETING_DILEMMAS: Dict[int, StrategicDilemma] = {
    # -------------------------------------------------------------------------
    # Q1: Introductory Strategic Dilemma (Retains original options + ₹0 choice)
    # -------------------------------------------------------------------------
    1: {
        "id": "macro_headwind_growth_q1",
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
    },
    # -------------------------------------------------------------------------
    # Q2: Sector Counter-Strike (Every option requires positive cash commit > 0)
    # -------------------------------------------------------------------------
    2: {
        "id": "sector_counter_strike_q2",
        "headline": "COMPETITIVE ENCIRCLEMENT & CHANNEL CARTELIZATION",
        "context_brief": (
            "Sector rivals and aggressive venture-backed challengers have formed channel syndicates, "
            "locking downstream distribution and bidding up key customer pipelines. Sitting out is impossible: "
            "distributors require immediate deposits and committed marketing spend to maintain shelf priority."
        ),
        "options": [
            {
                "id": "q2_channel_syndicate_lockout",
                "title": "DISTRIBUTION LOCKOUT // EXCLUSIVE CARRIER SYNDICATE",
                "tagline": "Secure exclusive channel tiering by fronting distributor incentive bonuses.",
                "description": "Lock distributor networks with mandatory co-op marketing deposits, barring tier-2 rivals from priority shelves.",
                "tradeoff": "Heavy liquidity outlay // Delivers decisive market share expansion and brand authority.",
                "cost_cash": 28000.0,
                "stat_deltas": {
                    "market_share": 3.8,
                    "brand": 7.0,
                    "client_satisfaction": 3.0,
                    "risk": 3.0,
                    "investor_confidence": 4.0,
                },
                "press_headline": "{company} LOCKS UP REGIONAL DISTRIBUTION CHANNELS",
                "press_body": "In a bold commercial coup, {company} secured exclusive channel rights across vital distribution corridors, squeezing competitors into peripheral niches.",
            },
            {
                "id": "q2_aggressive_poaching",
                "title": "ENTERPRISE ACCOUNT POACHING // BOUNTY INCENTIVES",
                "tagline": "Finance aggressive contract buyout bounties to sever rival enterprise accounts.",
                "description": "Offer guaranteed contract buyout subsidies to lure top-tier corporate clients away from struggling rivals.",
                "tradeoff": "Substantial cash outlay and elevated risk // Rapidly captures high-value client volume.",
                "cost_cash": 20000.0,
                "stat_deltas": {
                    "market_share": 2.8,
                    "client_satisfaction": 4.0,
                    "risk": 4.5,
                    "investor_confidence": 2.5,
                    "brand": 3.0,
                },
                "press_headline": "{company} RAIDS RIVAL ENTERPRISE CLIENT ROSTERS",
                "press_body": "{company} shook corporate circles by launching a targeted buyout initiative, absorbing blue-chip clients straight out of competitors' books.",
            },
            {
                "id": "q2_targeted_niche_counter",
                "title": "SPECIALIZED VERTICAL SIEGE // NICHE FORTRESS",
                "tagline": "Concentrate campaign spending in high-margin specialized verticals.",
                "description": "Deploy focused campaign assets to dominate high-margin enterprise segments where rivals lack domain depth.",
                "tradeoff": "Moderate capital outlay // Drives resilient client loyalty and solid brand gains.",
                "cost_cash": 14000.0,
                "stat_deltas": {
                    "market_share": 1.6,
                    "brand": 4.5,
                    "client_satisfaction": 5.0,
                    "risk": 1.5,
                    "board_confidence": 3.0,
                },
                "press_headline": "{company} CARVES UNASSAILABLE NICHE FOOTHOLD",
                "press_body": "By concentrating commercial resources into elite specialized verticals, {company} insulated its core revenues against sector-wide channel volatility.",
            },
            {
                "id": "q2_tactical_client_shield",
                "title": "CONTRACTUAL DEFENSE BARRIER // MINIMUM RETENTION ESCROW",
                "tagline": "Fund minimum defensive service guarantees and tier maintenance to stop defection.",
                "description": "Allocate baseline required security deposits and SLA performance guarantees to protect existing accounts from aggressive rival poaching.",
                "tradeoff": "Modest cash spend with minimal expansion // Preserves client base and reduces systemic risk.",
                "cost_cash": 9000.0,
                "stat_deltas": {
                    "client_satisfaction": 4.0,
                    "market_share": 0.4,
                    "risk": -3.0,
                    "board_confidence": 2.5,
                    "investor_confidence": 1.5,
                },
                "press_headline": "{company} STABILIZES ENTERPRISE MOAT AGAINST HOSTILE RAIDS",
                "press_body": "Choosing prudent stabilization over reckless expansion, {company} funded robust SLA protections to ensure client continuity during intense sector turbulence.",
            },
        ],
    },
    # -------------------------------------------------------------------------
    # Q3: Supply & Talent Monopoly Pivot (Higher baseline costs, higher stakes)
    # -------------------------------------------------------------------------
    3: {
        "id": "supply_monopoly_pivot_q3",
        "headline": "SUPPLY CHAIN WARFARE & ENTERPRISE CONSOLIDATION",
        "context_brief": (
            "Major supply partners are teetering and global inflation is spiking component indices. "
            "Simultaneously, a key regional conglomerate is liquidating assets, sparking an urgent bidding war "
            "for supply priority, certified tech components, and strategic enterprise accounts."
        ),
        "options": [
            {
                "id": "q3_hostile_supplier_buyout",
                "title": "UPSTREAM MONOPOLY // HOSTILE SUPPLIER LOCK-IN",
                "tagline": "Pay pre-emptive advances to corner upstream production and starve competitors.",
                "description": "Secure contractual exclusivity with Tier-1 component fabricators through aggressive up-front capital commitments.",
                "tradeoff": "Heavy treasury demand // Strangles rival supply lines and captures dominant market share.",
                "cost_cash": 42000.0,
                "stat_deltas": {
                    "market_share": 5.0,
                    "brand": 6.0,
                    "risk": 5.0,
                    "investor_confidence": 5.0,
                    "client_satisfaction": 3.0,
                },
                "press_headline": "{company} CORNERS UPSTREAM COMPONENT PIPELINE",
                "press_body": "In a predatory maneuver that rattled industrial supply chains, {company} bought out critical fabricator output, leaving competitors scrambling for scarce alternatives.",
            },
            {
                "id": "q3_enterprise_ecosystem_expansion",
                "title": "PLATFORM ECOSYSTEM EXPANSION // PARTNER SUBSIDIES",
                "tagline": "Subsidize integration software to lock enterprise partners into your proprietary ecosystem.",
                "description": "Co-fund integration engineering for top 20 sector clients, embedding your operations into their daily architecture.",
                "tradeoff": "High capital commitment // Builds nearly insurmountable switching moats and expands market share.",
                "cost_cash": 30000.0,
                "stat_deltas": {
                    "market_share": 3.5,
                    "client_satisfaction": 7.0,
                    "brand": 5.0,
                    "risk": 2.0,
                    "investor_confidence": 3.0,
                },
                "press_headline": "{company} DEPLOYS PROPRIETARY ECOSYSTEM LOCK-IN",
                "press_body": "{company} solidified its corporate dominance by funding end-to-end integration across tier-one clients, virtually eliminating customer churn.",
            },
            {
                "id": "q3_counter_inflationary_hedging",
                "title": "COUNTER-INFLATION ADVANCE // BULK COMMODITY RESERVES",
                "tagline": "Hedge rising input costs by acquiring strategic reserves in advance.",
                "description": "Commit liquidity into forward bulk contracts, ensuring guaranteed operational delivery rates while competitors face inflation spikes.",
                "tradeoff": "Substantial cash commitment // Lowers enterprise risk and stabilizes margins.",
                "cost_cash": 22000.0,
                "stat_deltas": {
                    "risk": -5.0,
                    "market_share": 1.5,
                    "client_satisfaction": 5.0,
                    "board_confidence": 4.0,
                    "brand": 2.0,
                },
                "press_headline": "{company} HEDGES SUPPLY VOLATILITY WITH BULK RESERVES",
                "press_body": "Prudently insulating operations against macroeconomic inflation, {company} locked in critical forward supply reserves, guaranteeing client contract delivery.",
            },
            {
                "id": "q3_selective_market_defense",
                "title": "SELECTIVE TERRITORIAL DEFENSE // STRATEGIC REGROUPING",
                "tagline": "Targeted marketing defensive outlay to preserve core accounts and essential branding.",
                "description": "Commit the baseline capital necessary to maintain essential account guarantees and counter hostile rival poaching in core territories.",
                "tradeoff": "Baseline cash drain with restricted growth // Protects core solvency and prevents client erosion.",
                "cost_cash": 15000.0,
                "stat_deltas": {
                    "market_share": 0.5,
                    "client_satisfaction": 3.5,
                    "risk": -2.0,
                    "board_confidence": 2.5,
                    "investor_confidence": 1.0,
                },
                "press_headline": "{company} HOLDS DEFENSIVE BARRICADES AMID SECTOR CRUNCH",
                "press_body": "Navigating severe industrial supply pressures, {company} defended its core enterprise perimeter through targeted defensive spending.",
            },
        ],
    },
    # -------------------------------------------------------------------------
    # Q4: Terminal Market Reckoning (Highest cost pressure and toughest trade-offs)
    # -------------------------------------------------------------------------
    4: {
        "id": "terminal_market_dominance_q4",
        "headline": "TERMINAL INDUSTRY CONSOLIDATION & ENDGAME WARFARE",
        "context_brief": (
            "The corporate cycle is reaching its final reckoning. Weaker competitors are defaulting, "
            "regulators are preparing final compliance reviews, and enterprise clients are making decade-long "
            "sole-vendor commitments. Decisive capital deployment will either cement your market hegemony or leave you vulnerable."
        ),
        "options": [
            {
                "id": "q4_total_industry_monopoly",
                "title": "TOTAL SECTOR CONSOLIDATION // FINAL HEGEMONY BLITZ",
                "tagline": "Deploy massive war chest to absorb distressed competitors and claim undisputed monopoly.",
                "description": "Launch an all-out commercial blitz: acquire distressed rival contracts, buy out key enterprise licenses, and dominate sector media.",
                "tradeoff": "Maximum liquid cash drain with elevated scrutiny // Delivers peak market share and supreme brand authority.",
                "cost_cash": 55000.0,
                "stat_deltas": {
                    "market_share": 6.5,
                    "brand": 10.0,
                    "risk": 6.0,
                    "investor_confidence": 6.0,
                    "client_satisfaction": 4.0,
                },
                "press_headline": "{company} CROWNS ITSELF UNDISPUTED INDUSTRY HEGEMON",
                "press_body": "In a historic year-end power play, {company} mobilized unprecedented capital reserves to consolidate the sector, claiming undisputed market supremacy.",
            },
            {
                "id": "q4_enterprise_platform_lock",
                "title": "SOLE-SOURCE STRATEGIC LOCK-IN // ENTERPRISE ALLIANCE",
                "tagline": "Guarantee multi-year pricing and dedicated infrastructure for top 50 sector accounts.",
                "description": "Commit heavy operational capital to construct custom dedicated client infrastructure, locking in multi-year sole-source contracts.",
                "tradeoff": "Heavy liquidity drain // Maximum client satisfaction and defensible long-term market share.",
                "cost_cash": 40000.0,
                "stat_deltas": {
                    "market_share": 4.2,
                    "client_satisfaction": 9.0,
                    "brand": 6.0,
                    "risk": 1.0,
                    "board_confidence": 5.0,
                    "investor_confidence": 4.0,
                },
                "press_headline": "{company} CEMENTS DECADE-LONG CLIENT ALLIANCES",
                "press_body": "{company} locked up the region's largest enterprise buyers through bespoke multi-year infrastructure commitments, building an unbreakable competitive moat.",
            },
            {
                "id": "q4_defensive_solvency_shield",
                "title": "TERMINAL BALANCE SHEET SHIELD // FORTIFIED SOLVENCY",
                "tagline": "Fortify reserves, clear balance sheet liabilities, and prepare for endgame board audit.",
                "description": "Direct required liquidity into final audit certifications, client escrow guarantees, and strategic compliance verification.",
                "tradeoff": "Substantial capital commitment // Drastically slashes operational risk and maximizes board confidence.",
                "cost_cash": 28000.0,
                "stat_deltas": {
                    "risk": -7.0,
                    "board_confidence": 6.0,
                    "investor_confidence": 4.5,
                    "client_satisfaction": 4.0,
                    "market_share": 1.0,
                },
                "press_headline": "{company} FORTIFIES SOLVENCY IN PREPARATION FOR ENDGAME",
                "press_body": "Prioritizing balance sheet integrity and investor security, {company} shored up capital reserves to navigate terminal fiscal audits with zero vulnerability.",
            },
            {
                "id": "q4_emergency_market_sustainment",
                "title": "EMERGENCY MARKET SUSTAINMENT // MINIMUM SURVIVAL MANDATE",
                "tagline": "Commit strictly required capital to maintain active licenses and prevent immediate contract forfeiture.",
                "description": "Fulfill mandatory statutory market listings and minimum commercial operating fees to keep company operations viable into Q4 close.",
                "tradeoff": "Baseline cash drain // Averts operational forfeiture while conserving remaining balance sheet reserves.",
                "cost_cash": 20000.0,
                "stat_deltas": {
                    "market_share": 0.2,
                    "risk": -2.0,
                    "client_satisfaction": 2.0,
                    "board_confidence": 3.0,
                    "investor_confidence": 2.0,
                },
                "press_headline": "{company} NAVIGATES TERMINAL CYCLE ON DISCIPLINED TERMS",
                "press_body": "Resisting high-risk reckless buyouts, {company} fulfilled required market commitments with surgical discipline, preserving cash heading into the final board reckoning.",
            },
        ],
    },
}

# Flat list of all dilemmas across all quarters for backward-compatible lookups by ID
MARKETING_STRATEGIC_DILEMMAS: List[StrategicDilemma] = list(QUARTER_MARKETING_DILEMMAS.values())

# Also keep legacy dilemma ID alias mapping for backward compatibility if needed
_LEGACY_Q1_DILEMMA = dict(QUARTER_MARKETING_DILEMMAS[1])
_LEGACY_Q1_DILEMMA["id"] = "macro_headwind_growth"
MARKETING_STRATEGIC_DILEMMAS.insert(0, _LEGACY_Q1_DILEMMA)


def get_dilemmas_for_quarter(quarter: int) -> List[StrategicDilemma]:
    """
    Returns the strategic marketing dilemma corresponding to the specified quarter (1-4).
    Defaults to Q4 dilemma for quarters beyond 4, and Q1 for quarter <= 1.
    """
    q = max(1, min(4, quarter))
    return [QUARTER_MARKETING_DILEMMAS[q]]
