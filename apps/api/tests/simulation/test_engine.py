import pytest

from app.simulation.engine import tick
from app.simulation.models import CompanyState, Decision, MarketSnapshot


def make_baseline_state() -> CompanyState:
    """
    A neutral starting point every test can build from -- avoids
    repeating this 15-field constructor in every single test function.
    """
    return CompanyState(
        cash=100_000,
        revenue=50_000,
        profit=10_000,
        debt=0,
        stock_price=100,
        employees=50,
        innovation=50,
        brand=50,
        client_satisfaction=50,
        employee_satisfaction=50,
        investor_confidence=50,
        esg=50,
        risk=20,
        market_share=10,
        board_confidence=70,
    )


def test_marketing_spend_increases_brand():
    state = make_baseline_state()
    decisions = [Decision(category="marketing", amount=10_000)]

    result = tick(state, decisions, seed=42)

    assert result.new_state.brand > state.brand


def test_zero_spend_quarter_still_applies_baseline_drift():
    """
    A player who spends nothing shouldn't get a free pass -- baseline
    drift (entropy) should still move metrics, proving 'coasting' has
    a real cost, per the design intent from the engineering spec.
    """
    state = make_baseline_state()

    result = tick(state, decisions=[], seed=42)

    assert result.new_state.risk > state.risk
    assert result.new_state.employee_satisfaction < state.employee_satisfaction
    assert result.new_state.cash == state.cash


def test_overspending_raises_value_error():
    state = make_baseline_state()
    decisions = [Decision(category="marketing", amount=999_999)]

    with pytest.raises(ValueError):
        tick(state, decisions, seed=42)


def test_bounded_metrics_never_exceed_100():
    state = make_baseline_state()
    state.brand = 99
    decisions = [Decision(category="marketing", amount=100_000)]

    result = tick(state, decisions, seed=1)

    assert result.new_state.brand <= 100


def test_bounded_metrics_never_go_below_zero():
    state = make_baseline_state()
    state.employee_satisfaction = 1
    decisions = [Decision(category="layoffs", amount=10_000)]

    result = tick(state, decisions, seed=1)

    assert result.new_state.employee_satisfaction >= 0


def test_same_seed_produces_identical_results():
    """
    Proves the 'deterministic given a seed' property from Concepts --
    the whole reason we use a seeded RNG instead of plain random.
    """
    state = make_baseline_state()
    decisions = [Decision(category="rnd", amount=5_000)]

    result_a = tick(state, decisions, seed=7)
    result_b = tick(state, decisions, seed=7)

    assert result_a.new_state.innovation == result_b.new_state.innovation
    assert result_a.new_state.stock_price == result_b.new_state.stock_price


def test_different_seeds_produce_different_results():
    state = make_baseline_state()
    decisions = [Decision(category="rnd", amount=5_000)]

    result_a = tick(state, decisions, seed=1)
    result_b = tick(state, decisions, seed=2)

    assert result_a.new_state.innovation != result_b.new_state.innovation


def test_cash_debited_by_exact_spend_amount():
    state = make_baseline_state()
    decisions = [Decision(category="cybersecurity", amount=15_000)]

    result = tick(state, decisions, seed=1)

    assert result.new_state.cash == state.cash - 15_000


def test_loans_increase_both_cash_and_debt():
    state = make_baseline_state()
    decisions = [Decision(category="loans", amount=20_000)]

    result = tick(state, decisions, seed=1)

    assert result.new_state.debt > state.debt
    assert result.new_state.cash != state.cash - 20_000  # loans add cash back


def test_market_macro_effects_reduce_profit_when_provided():
    state = make_baseline_state()
    state.debt = 50_000
    market = MarketSnapshot(interest_rate=10, inflation=5)

    result_with_market = tick(state, decisions=[], market=market, seed=1)
    result_without_market = tick(state, decisions=[], market=None, seed=1)

    assert result_with_market.new_state.profit < result_without_market.new_state.profit


def test_low_board_confidence_triggers_board_session():
    state = make_baseline_state()
    state.board_confidence = 41
    decisions = [Decision(category="layoffs", amount=50_000)]

    result = tick(state, decisions, seed=1)

    assert result.board_session_required is True


def test_negative_cash_triggers_bankruptcy_flag():
    state = make_baseline_state()
    state.cash = 100
    state.debt = 1000
    result = tick(state, decisions=[], market=MarketSnapshot(interest_rate=500), seed=1)

    assert result.new_state.cash < 0
    assert result.bankruptcy is True


def test_invalid_category_rejected_by_pydantic():
    with pytest.raises(Exception):
        Decision(category="not_a_real_category", amount=100)