import random

from app.simulation.config_loader import load_impact_config
from app.simulation.models import (
    CompanyState,
    CompanyTraits,
    Decision,
    MarketSnapshot,
    TickResult,
)

BOUNDED_METRICS = [
    "innovation", "brand", "client_satisfaction", "employee_satisfaction",
    "investor_confidence", "esg", "risk", "market_share", "board_confidence",
]


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def _apply_category_effects(
    decisions: list[Decision], config: dict, deltas: dict[str, float]
) -> float:
    """
    Applies each decision's primary + secondary effects into `deltas`
    (mutated in place). Returns total cash spent, since every decision
    debits cash regardless of its category's specific effects.
    """
    total_spent = 0.0
    categories = config["categories"]

    for decision in decisions:
        total_spent += decision.amount
        spend_units = decision.amount / 1000.0

        category_config = categories[decision.category]

        primary = category_config["primary"]
        deltas[primary["metric"]] = (
            deltas.get(primary["metric"], 0.0) + primary["coefficient"] * spend_units
        )

        for secondary in category_config["secondary"]:
            deltas[secondary["metric"]] = (
                deltas.get(secondary["metric"], 0.0)
                + secondary["coefficient"] * spend_units
            )

    return total_spent


def _apply_baseline_drift(config: dict, deltas: dict[str, float]) -> None:
    for metric, drift in config["baseline_drift"].items():
        deltas[metric] = deltas.get(metric, 0.0) + drift


def _apply_market_macro(
    market: MarketSnapshot | None,
    state: CompanyState,
    config: dict,
    deltas: dict[str, float],
) -> None:
    if market is None:
        return

    macro_config = config["market_macro"]

    interest_cost = state.debt * (market.interest_rate / 100.0) * macro_config[
        "interest_rate_debt_drag"
    ]
    deltas["profit"] = deltas.get("profit", 0.0) - interest_cost

    inflation_cost = (
        state.employees * market.inflation * macro_config["inflation_employee_cost_drag"]
    )
    deltas["profit"] = deltas.get("profit", 0.0) - inflation_cost


def _apply_passive_traits(traits: CompanyTraits | None, deltas: dict[str, float]) -> None:
    if traits is None:
        return
    for metric, multiplier in traits.passive_multipliers.items():
        if metric in deltas:
            deltas[metric] *= multiplier


def _apply_variance(config: dict, deltas: dict[str, float], seed: int) -> None:
    rng = random.Random(seed)
    max_fraction = config["variance"]["max_fraction"]
    for metric in list(deltas.keys()):
        variance_factor = 1 + rng.uniform(-max_fraction, max_fraction)
        deltas[metric] *= variance_factor


def _compute_stock_price(
    old_price: float, deltas: dict[str, float], config: dict
) -> float:
    cfg = config["stock_price"]
    profit_effect = deltas.get("profit", 0.0) * cfg["profit_trend_weight"]
    investor_effect = deltas.get("investor_confidence", 0.0) * cfg[
        "investor_confidence_weight"
    ]
    brand_effect = deltas.get("brand", 0.0) * cfg["brand_weight"]

    raw_change_fraction = (profit_effect + investor_effect + brand_effect) / 100.0
    max_swing = cfg["max_quarter_swing_fraction"]
    clamped_fraction = max(-max_swing, min(max_swing, raw_change_fraction))

    new_price = old_price * (1 + clamped_fraction)
    return max(0.0, new_price)


def _compute_board_confidence(
    old_confidence: float, deltas: dict[str, float], config: dict
) -> float:
    cfg = config["board_confidence"]
    change = (
        deltas.get("profit", 0.0) * cfg["profit_trend_weight"] / 1000.0
        + deltas.get("esg", 0.0) * cfg["esg_weight"]
        + deltas.get("risk", 0.0) * cfg["risk_weight"]
        + deltas.get("investor_confidence", 0.0) * cfg["investor_confidence_weight"]
    )
    return _clamp(old_confidence + change)


def tick(
    state: CompanyState,
    decisions: list[Decision],
    market: MarketSnapshot | None = None,
    traits: CompanyTraits | None = None,
    seed: int = 0,
) -> TickResult:
    """
    The core simulation tick. Pure function -- no I/O, no randomness
    beyond the seeded RNG derived from `seed`, fully deterministic for
    a given input. See Phase 7 docs for the full algorithm breakdown.
    """
    config = load_impact_config()
    deltas: dict[str, float] = {}

    total_spent = _apply_category_effects(decisions, config, deltas)

    if total_spent > state.cash:
        raise ValueError(
            f"Decisions total {total_spent} exceeds available cash {state.cash}"
        )

    _apply_baseline_drift(config, deltas)
    _apply_market_macro(market, state, config, deltas)
    _apply_passive_traits(traits, deltas)
    _apply_variance(config, deltas, seed)

    new_cash = state.cash - total_spent + deltas.get("cash", 0.0) + deltas.get('profit', 0.0)
    new_debt = state.debt + deltas.get("debt", 0.0)
    new_profit = state.profit + deltas.get("profit", 0.0)
    new_revenue = state.revenue + deltas.get("revenue", 0.0)
    new_employees = max(0, state.employees + int(deltas.get("employees", 0.0)))

    new_state_dict = {
        "cash": new_cash,
        "revenue": new_revenue,
        "profit": new_profit,
        "debt": new_debt,
        "employees": new_employees,
    }

    for metric in BOUNDED_METRICS:
        current_value = getattr(state, metric)
        new_state_dict[metric] = _clamp(current_value + deltas.get(metric, 0.0))

    new_state_dict["stock_price"] = _compute_stock_price(
        state.stock_price, deltas, config
    )
    new_state_dict["board_confidence"] = _compute_board_confidence(
        state.board_confidence, deltas, config
    )

    new_state = CompanyState(**new_state_dict)

    board_threshold = config["board_confidence"]["board_session_threshold"]
    board_session_required = new_state.board_confidence < board_threshold
    bankruptcy = new_state.cash < 0

    return TickResult(
        new_state=new_state,
        deltas=deltas,
        board_session_required=board_session_required,
        bankruptcy=bankruptcy,
    )