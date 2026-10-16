"""
Market Cascade Training scenarios and deterministic causal precedence graphs.
No LLM grading -- purely deterministic pairwise topological precedence.
Tone: Intuitive, accessible macroeconomic cause-and-effect designed for players.
"""

from typing import TypedDict, List, Dict, Tuple


class ScenarioCard(TypedDict):
    id: str
    text: str
    badge: str


class MarketScenario(TypedDict):
    id: str
    title: str
    code: str
    shock_name: str
    shock_value: str
    shock_description: str
    cards: List[ScenarioCard]  # Initially displayed in scrambled presentation order
    correct_order: List[str]   # The correct sequence from step 1 to 5
    precedence_rules: List[Tuple[str, str]]
    explanations: Dict[str, str]


MARKET_CASCADE_SCENARIOS: List[MarketScenario] = [
    {
        "id": "scenario_interest_rate",
        "title": "BORROWING COST SHOCK",
        "code": "MACRO-01",
        "shock_name": "CENTRAL BANK RAISES INTEREST RATES",
        "shock_value": "INTEREST RATE +1.5%",
        "shock_description": "The central bank increases interest rates to slow down inflation.",
        # Scrambled presentation cards (card 1..5 in the initial display)
        "cards": [
            {
                "id": "spending_drops",
                "text": "Businesses cut back on spending and delay new projects",
                "badge": "STEP A",
            },
            {
                "id": "bank_rates_up",
                "text": "Banks increase interest rates on all new and existing loans",
                "badge": "STEP B",
            },
            {
                "id": "growth_slows",
                "text": "Overall company sales drop and economy slows down",
                "badge": "STEP C",
            },
            {
                "id": "loans_expensive",
                "text": "Borrowing money becomes much more expensive for companies",
                "badge": "STEP D",
            },
            {
                "id": "less_borrowing",
                "text": "Companies take out fewer loans to avoid heavy interest debt",
                "badge": "STEP E",
            },
        ],
        "correct_order": [
            "bank_rates_up",
            "loans_expensive",
            "less_borrowing",
            "spending_drops",
            "growth_slows",
        ],
        "precedence_rules": [
            ("bank_rates_up", "loans_expensive"),
            ("loans_expensive", "less_borrowing"),
            ("less_borrowing", "spending_drops"),
            ("spending_drops", "growth_slows"),
        ],
        "explanations": {
            "bank_rates_up": "1. Central bank raises benchmark rates -> Banks immediately raise loan rates.",
            "loans_expensive": "2. As loan rates jump, taking on debt becomes noticeably more expensive.",
            "less_borrowing": "3. Because loans cost more, companies stop borrowing new money.",
            "spending_drops": "4. With less borrowed cash on hand, businesses freeze expansions and cuts spending.",
            "growth_slows": "5. Lower business investment causes customer orders to drop and overall economy slows.",
        },
    },
    {
        "id": "scenario_oil_shock",
        "title": "ENERGY PRICE SPIKE",
        "code": "MACRO-02",
        "shock_name": "OIL & FUEL SHORTAGE",
        "shock_value": "OIL PRICE +30%",
        "shock_description": "A global pipeline breakdown causes fuel and crude oil prices to jump 30%.",
        "cards": [
            {
                "id": "retail_prices_up",
                "text": "Stores raise prices for customers, driving up inflation",
                "badge": "STEP A",
            },
            {
                "id": "fuel_cost_rises",
                "text": "Price of diesel and jet fuel climbs at fuel stations",
                "badge": "STEP B",
            },
            {
                "id": "margins_shrink",
                "text": "Company profit margins shrink because operating costs jumped",
                "badge": "STEP C",
            },
            {
                "id": "shipping_expensive",
                "text": "Trucking, cargo shipping, and delivery costs increase",
                "badge": "STEP D",
            },
            {
                "id": "making_goods_costs_more",
                "text": "Cost of manufacturing products and running factories increases",
                "badge": "STEP E",
            },
        ],
        "correct_order": [
            "fuel_cost_rises",
            "shipping_expensive",
            "making_goods_costs_more",
            "margins_shrink",
            "retail_prices_up",
        ],
        "precedence_rules": [
            ("fuel_cost_rises", "shipping_expensive"),
            ("shipping_expensive", "making_goods_costs_more"),
            ("making_goods_costs_more", "margins_shrink"),
            ("margins_shrink", "retail_prices_up"),
        ],
        "explanations": {
            "fuel_cost_rises": "1. Oil shortage immediately causes fuel prices to rise at refineries.",
            "shipping_expensive": "2. Trucks, planes, and cargo ships now cost significantly more to fuel.",
            "making_goods_costs_more": "3. Moving parts to factories and powering machinery becomes more expensive.",
            "margins_shrink": "4. Higher production costs immediately eat into companies' profit margins.",
            "retail_prices_up": "5. Companies raise end-product prices to survive, increasing inflation for shoppers.",
        },
    },
    {
        "id": "scenario_currency_shock",
        "title": "CURRENCY VALUE DROP",
        "code": "MACRO-03",
        "shock_name": "DOMESTIC CURRENCY WEAKENS",
        "shock_value": "CURRENCY VALUE -10%",
        "shock_description": "Foreign currency markets cause the Indian Rupee (INR) to lose 10% of its value.",
        "cards": [
            {
                "id": "local_prices_rise",
                "text": "Prices of imported electronics and food rise for local consumers",
                "badge": "STEP A",
            },
            {
                "id": "currency_drops",
                "text": "Local money loses value against foreign currencies",
                "badge": "STEP B",
            },
            {
                "id": "profit_squeezed",
                "text": "Companies that rely on imported parts see profits decline",
                "badge": "STEP C",
            },
            {
                "id": "imports_more_expensive",
                "text": "Buying raw materials from other countries now costs more money",
                "badge": "STEP D",
            },
            {
                "id": "factory_bill_up",
                "text": "Domestic factories face higher bills for foreign parts and tools",
                "badge": "STEP E",
            },
        ],
        "correct_order": [
            "currency_drops",
            "imports_more_expensive",
            "factory_bill_up",
            "profit_squeezed",
            "local_prices_rise",
        ],
        "precedence_rules": [
            ("currency_drops", "imports_more_expensive"),
            ("imports_more_expensive", "factory_bill_up"),
            ("factory_bill_up", "profit_squeezed"),
            ("profit_squeezed", "local_prices_rise"),
        ],
        "explanations": {
            "currency_drops": "1. The local currency depreciates on foreign exchange markets.",
            "imports_more_expensive": "2. Foreign exchange required to buy imported goods now costs more rupees.",
            "factory_bill_up": "3. Factories paying foreign suppliers see their inventory bills shoot up.",
            "profit_squeezed": "4. The sudden cost jump squeezes company profits before contracts can change.",
            "local_prices_rise": "5. Importers raise retail prices on store shelves to cover the foreign exchange loss.",
        },
    },
    {
        "id": "scenario_commodity_shock",
        "title": "RAW MATERIAL SHORTAGE",
        "code": "MACRO-04",
        "shock_name": "COMMODITY PRICE SURGE",
        "shock_value": "METALS & MATERIALS +25%",
        "shock_description": "Mines and suppliers face supply chain bottlenecks, raising metals and material prices by 25%.",
        "cards": [
            {
                "id": "producers_raise_prices",
                "text": "Suppliers introduce price hikes and renegotiate contracts with buyers",
                "badge": "STEP A",
            },
            {
                "id": "raw_materials_jump",
                "text": "Market price of steel, copper, and raw chemicals spikes",
                "badge": "STEP B",
            },
            {
                "id": "profits_take_hit",
                "text": "Company profit per product sold drops significantly",
                "badge": "STEP C",
            },
            {
                "id": "buyers_rush_to_hoard",
                "text": "Companies rush to buy up extra materials before prices climb higher",
                "badge": "STEP D",
            },
            {
                "id": "unit_production_cost_rises",
                "text": "The cost to build each product increases for manufacturing plants",
                "badge": "STEP E",
            },
        ],
        "correct_order": [
            "raw_materials_jump",
            "buyers_rush_to_hoard",
            "unit_production_cost_rises",
            "profits_take_hit",
            "producers_raise_prices",
        ],
        "precedence_rules": [
            ("raw_materials_jump", "buyers_rush_to_hoard"),
            ("buyers_rush_to_hoard", "unit_production_cost_rises"),
            ("unit_production_cost_rises", "profits_take_hit"),
            ("profits_take_hit", "producers_raise_prices"),
        ],
        "explanations": {
            "raw_materials_jump": "1. Scarcity pushes up market prices for key raw materials like steel and copper.",
            "buyers_rush_to_hoard": "2. Businesses panic-buy supplies to secure stock before prices go even higher.",
            "unit_production_cost_rises": "3. Factories build goods with costlier raw materials, raising per-unit costs.",
            "profits_take_hit": "4. Pre-negotiated client prices mean companies absorb the loss initially.",
            "producers_raise_prices": "5. Companies finally announce price hikes to clients to restore their profits.",
        },
    },
    {
        "id": "scenario_runaway_inflation",
        "title": "HIGH INFLATION SPIRAL",
        "code": "MACRO-05",
        "shock_name": "CONSUMER INFLATION SURGES",
        "shock_value": "INFLATION +5.0%",
        "shock_description": "Everyday prices surge across the city, reducing everyday purchasing power.",
        "cards": [
            {
                "id": "sales_drop",
                "text": "Company sales drop and revenue falls across the market",
                "badge": "STEP A",
            },
            {
                "id": "inflation_rises",
                "text": "Prices of rent, groceries, and services climb rapidly",
                "badge": "STEP B",
            },
            {
                "id": "corporate_squeeze",
                "text": "Companies face lower profits while paying higher operating bills",
                "badge": "STEP C",
            },
            {
                "id": "customers_have_less_cash",
                "text": "Shoppers have less leftover cash after paying for necessities",
                "badge": "STEP D",
            },
            {
                "id": "cut_non_essentials",
                "text": "Shoppers cut non-essential purchases and stop buying luxury goods",
                "badge": "STEP E",
            },
        ],
        "correct_order": [
            "inflation_rises",
            "customers_have_less_cash",
            "cut_non_essentials",
            "sales_drop",
            "corporate_squeeze",
        ],
        "precedence_rules": [
            ("inflation_rises", "customers_have_less_cash"),
            ("customers_have_less_cash", "cut_non_essentials"),
            ("cut_non_essentials", "sales_drop"),
            ("sales_drop", "corporate_squeeze"),
        ],
        "explanations": {
            "inflation_rises": "1. Headline inflation pushes up living costs for households.",
            "customers_have_less_cash": "2. Basic living costs eat up paychecks, leaving less disposable income.",
            "cut_non_essentials": "3. Families stop spending on non-essentials and upgrades to protect savings.",
            "sales_drop": "4. Fewer customer purchases directly drag down corporate revenue.",
            "corporate_squeeze": "5. Companies earn less while their own fixed costs remain high, squeezing profit.",
        },
    },
]


def grade_cascade_prediction(
    scenario_id: str, submitted_order: List[str]
) -> dict:
    scenario = next((s for s in MARKET_CASCADE_SCENARIOS if s["id"] == scenario_id), None)
    if not scenario:
        raise ValueError(f"Unknown scenario: {scenario_id}")

    correct_order = scenario["correct_order"]
    n = len(correct_order)

    # 1. Exact position checks
    position_results = []
    exact_matches = 0
    for idx, card_id in enumerate(submitted_order):
        ideal_pos = correct_order.index(card_id) if card_id in correct_order else -1
        is_exact = ideal_pos == idx
        if is_exact:
            exact_matches += 1
            status = "correct"
        elif abs(ideal_pos - idx) <= 1:
            status = "near"
        else:
            status = "incorrect"

        position_results.append({
            "card_id": card_id,
            "submitted_position": idx + 1,
            "ideal_position": ideal_pos + 1,
            "status": status,
        })

    # 2. Pairwise precedence score (10 possible pairs in 5 elements)
    total_pairs = (n * (n - 1)) // 2  # 10
    satisfied_pairs = 0
    sub_indices = {card_id: i for i, card_id in enumerate(submitted_order)}

    for i in range(n):
        for j in range(i + 1, n):
            earlier = correct_order[i]
            later = correct_order[j]
            if sub_indices.get(earlier, 999) < sub_indices.get(later, -1):
                satisfied_pairs += 1

    pairwise_score = int(round((satisfied_pairs / total_pairs) * 100))
    origin_correct = submitted_order[0] == correct_order[0]

    score = pairwise_score
    if exact_matches == 5:
        score = 100
    elif score >= 85 and not origin_correct:
        score = 80

    is_passed = score >= 70

    return {
        "scenario_id": scenario_id,
        "score": score,
        "passed": is_passed,
        "exact_matches": exact_matches,
        "satisfied_pairs": satisfied_pairs,
        "total_pairs": total_pairs,
        "position_results": position_results,
        "correct_order": correct_order,
        "explanations": scenario["explanations"],
    }
