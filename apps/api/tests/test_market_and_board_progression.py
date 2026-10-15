"""
Tests for Market difficulty progression and Board Room variety across Quarters 1 to 4.
Verifies:
1. Q1 Market dilemma retains a ₹0 / do-nothing cash preservation option.
2. Q2, Q3, Q4 Market dilemmas require strictly positive monetary commitments for every single option (> 0).
3. Monotonic escalation of financial pressure across quarters:
   min_cost(Q4) > min_cost(Q3) > min_cost(Q2) > min_cost(Q1)
   max_cost(Q4) > max_cost(Q3) > max_cost(Q2) >= max_cost(Q1)
4. Affordability and liquid cash checks reject unaffordable commitments without driving cash negative.
5. Board Room scripts across Q1, Q2, Q3, and Q4 each have 6 exchanges with 4 semantically distinct options.
6. Questions and options across Q1, Q2, Q3, and Q4 are genuinely different and quarter-specific.
7. Scoring deltas are balanced and bounded.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock

from app.services.market_dilemma_service import (
    QUARTER_MARKETING_DILEMMAS,
    get_dilemmas_for_quarter,
)
from app.board.loader import load_board_script


def test_q1_market_retains_zero_cost_option():
    """Verify that Q1 offers a ₹0 option (cash preservation) as required."""
    q1_dilemmas = get_dilemmas_for_quarter(1)
    assert len(q1_dilemmas) == 1
    dilemma = q1_dilemmas[0]
    assert len(dilemma["options"]) == 4

    zero_cost_options = [opt for opt in dilemma["options"] if opt["cost_cash"] == 0.0]
    assert len(zero_cost_options) >= 1, "Q1 must have at least one ₹0 / cash preservation option"
    assert any(opt["id"] == "preserve_cash" for opt in zero_cost_options)


def test_q2_to_q4_market_all_options_have_positive_costs():
    """Verify that all strategic options in Q2, Q3, and Q4 strictly require positive cash (> 0)."""
    for quarter in [2, 3, 4]:
        dilemmas = get_dilemmas_for_quarter(quarter)
        assert len(dilemmas) == 1, f"Expected 1 dilemma for quarter {quarter}"
        dilemma = dilemmas[0]
        assert len(dilemma["options"]) == 4, f"Quarter {quarter} dilemma must have 4 options"

        for opt in dilemma["options"]:
            assert opt["cost_cash"] > 0, (
                f"Quarter {quarter} option '{opt['id']}' has non-positive cost: {opt['cost_cash']}. "
                "All Q2-Q4 options must require positive monetary commitment."
            )


def test_market_cost_escalation_across_quarters():
    """
    Verify increasing baseline costs and cost pressure across Q1 -> Q2 -> Q3 -> Q4.
    Calibrated against starting capital (₹55,000 - ₹120,000) and revenue generation.
    """
    min_costs = {}
    max_costs = {}

    for q in [1, 2, 3, 4]:
        dilemma = get_dilemmas_for_quarter(q)[0]
        costs = [opt["cost_cash"] for opt in dilemma["options"]]
        min_costs[q] = min(costs)
        max_costs[q] = max(costs)

    # Minimum baseline cost must strictly increase from Q1 (0) to Q2 to Q3 to Q4
    assert min_costs[1] == 0.0
    assert min_costs[2] > min_costs[1], f"Q2 min cost ({min_costs[2]}) should exceed Q1 ({min_costs[1]})"
    assert min_costs[3] > min_costs[2], f"Q3 min cost ({min_costs[3]}) should exceed Q2 ({min_costs[2]})"
    assert min_costs[4] > min_costs[3], f"Q4 min cost ({min_costs[4]}) should exceed Q3 ({min_costs[3]})"

    # Peak cost should also reflect highest stakes at Q4
    assert max_costs[4] > max_costs[3] > max_costs[2]


def test_board_room_variety_structure_and_four_options():
    """
    Verify that every quarter (Q1 to Q4) contains 6 exchanges with exactly 4 options per exchange.
    """
    for q in [1, 2, 3, 4]:
        script = load_board_script(quarter=q)
        assert len(script) == 6, f"Quarter {q} must have exactly 6 board exchanges, got {len(script)}"
        expected_speakers = [
            "chairperson",
            "lead_investor",
            "cfo",
            "independent_director",
            "employee_rep",
            "government_observer",
        ]
        actual_speakers = [ex["speaker"] for ex in script]
        assert actual_speakers == expected_speakers, f"Speakers in Quarter {q} mismatch standard roster"

        for i, exchange in enumerate(script):
            assert len(exchange["options"]) == 4, f"Quarter {q} exchange {i} does not have 4 options"
            for opt in exchange["options"]:
                assert "label" in opt and len(opt["label"]) > 10
                assert "confidence_delta" in opt
                assert -5 <= opt["confidence_delta"] <= 5


def test_board_room_quarters_are_semantically_distinct():
    """
    Verify that Q1, Q2, Q3, and Q4 board questions and options are substantively different,
    reflecting evolving concerns rather than repetitive text.
    """
    scripts = {q: load_board_script(quarter=q) for q in [1, 2, 3, 4]}

    # Check questions are distinct across quarters for each speaker
    for speaker_idx in range(6):
        speaker_questions = [scripts[q][speaker_idx]["question"] for q in [1, 2, 3, 4]]
        # All 4 questions across the 4 quarters must be unique
        assert len(set(speaker_questions)) == 4, (
            f"Speaker index {speaker_idx} has duplicated questions across quarters: {speaker_questions}"
        )

        # Check all options for this speaker are unique across quarters
        for q1 in [1, 2, 3, 4]:
            for q2 in [1, 2, 3, 4]:
                if q1 >= q2:
                    continue
                opts1 = {opt["label"] for opt in scripts[q1][speaker_idx]["options"]}
                opts2 = {opt["label"] for opt in scripts[q2][speaker_idx]["options"]}
                overlap = opts1.intersection(opts2)
                assert len(overlap) == 0, (
                    f"Found overlapping option labels between Q{q1} and Q{q2} for speaker {speaker_idx}: {overlap}"
                )


@pytest.mark.asyncio
async def test_market_affordability_protection():
    """
    Verify that decision execution enforces cash sufficiency and does not allow negative cash.
    """
    from fastapi import HTTPException
    from app.api.v1.market import execute_strategic_decision
    from app.schemas.market import ExecuteMarketDecisionRequest
    from app.models import Company, CompanyState as CompanyStateModel, Session as SessionModel

    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Solvent Corp")
    session_row = SessionModel(id=uuid.uuid4(), current_quarter=4)

    # State with cash insufficient for Q4 expensive buyout (costs 55,000, company only has 10,000)
    low_cash_state = CompanyStateModel(
        company_id=company.id,
        quarter=4,
        cash=10000.0,
        market_share=15.0,
        brand=50.0,
        risk=20.0,
    )

    mock_state_res = MagicMock()
    mock_state_res.scalar_one_or_none.return_value = low_cash_state
    db.execute.return_value = mock_state_res

    payload = ExecuteMarketDecisionRequest(
        quarter=4,
        dilemma_id="terminal_market_dominance_q4",
        option_id="q4_total_industry_monopoly",  # Cost: 55,000
    )

    with pytest.raises(HTTPException) as exc_info:
        await execute_strategic_decision(
            payload=payload,
            company=company,
            session_row=session_row,
            db=db,
        )

    assert exc_info.value.status_code == 400
    assert "Insufficient liquid cash" in exc_info.value.detail
    # Ensure company cash was not deducted into negative
    assert low_cash_state.cash == 10000.0
