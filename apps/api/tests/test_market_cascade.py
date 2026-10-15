import pytest
from app.services.market_cascade_service import (
    MARKET_CASCADE_SCENARIOS,
    grade_cascade_prediction,
)


def test_cascade_scenarios_count():
    assert len(MARKET_CASCADE_SCENARIOS) == 5
    codes = [s["code"] for s in MARKET_CASCADE_SCENARIOS]
    assert "MACRO-01" in codes
    assert "MACRO-02" in codes
    assert "MACRO-03" in codes
    assert "MACRO-04" in codes
    assert "MACRO-05" in codes


def test_deterministic_grading_perfect_match():
    scenario = MARKET_CASCADE_SCENARIOS[0]
    result = grade_cascade_prediction(scenario["id"], scenario["correct_order"])
    assert result["passed"] is True
    assert result["score"] == 100
    assert result["exact_matches"] == 5
    assert result["satisfied_pairs"] == 10


def test_deterministic_grading_minor_transposition():
    scenario = MARKET_CASCADE_SCENARIOS[0]
    # Swap elements 2 and 3 (adjacent transposition)
    order = list(scenario["correct_order"])
    order[1], order[2] = order[2], order[1]

    result = grade_cascade_prediction(scenario["id"], order)
    # Only 1 pair violated out of 10 -> 90% score, still passing partial credit
    assert result["score"] >= 80
    assert result["passed"] is True
    assert result["exact_matches"] == 3


def test_deterministic_grading_inverted_order():
    scenario = MARKET_CASCADE_SCENARIOS[0]
    order = list(reversed(scenario["correct_order"]))
    result = grade_cascade_prediction(scenario["id"], order)
    assert result["passed"] is False
    assert result["score"] == 0
    assert result["exact_matches"] == 1  # only middle element may align
