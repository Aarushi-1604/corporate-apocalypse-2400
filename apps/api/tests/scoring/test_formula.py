from app.scoring.config_loader import load_scoring_config
from app.scoring.formula import calculate_final_score


def make_state(**overrides) -> dict:
    base = {
        "revenue": 30000, "profit": 3000, "client_satisfaction": 50,
        "employee_satisfaction": 50, "innovation": 50, "investor_confidence": 50, "risk": 20,
    }
    base.update(overrides)
    return base


def test_full_four_quarter_run_gets_max_survival_score():
    states = [make_state() for _ in range(5)]  # 5 rows = 4 completed quarters
    result = calculate_final_score(states, load_scoring_config())
    assert result["survival_score"] == 100


def test_early_termination_scores_lower_survival():
    states = [make_state() for _ in range(3)]  # 2 completed quarters
    result = calculate_final_score(states, load_scoring_config())
    assert result["survival_score"] == 50


def test_zero_starting_revenue_does_not_crash():
    states = [make_state(revenue=0), make_state(revenue=5000)]
    result = calculate_final_score(states, load_scoring_config())
    assert isinstance(result["revenue_score"], float)


def test_strong_growth_scores_higher_than_decline():
    growth_states = [make_state(revenue=20000), make_state(revenue=40000)]
    decline_states = [make_state(revenue=40000), make_state(revenue=20000)]
    config = load_scoring_config()
    growth_result = calculate_final_score(growth_states, config)
    decline_result = calculate_final_score(decline_states, config)
    assert growth_result["final_score"] > decline_result["final_score"]


def test_high_risk_reduces_final_score():
    low_risk = [make_state(risk=10) for _ in range(3)]
    high_risk = [make_state(risk=90) for _ in range(3)]
    config = load_scoring_config()
    assert calculate_final_score(low_risk, config)["final_score"] > calculate_final_score(high_risk, config)["final_score"]