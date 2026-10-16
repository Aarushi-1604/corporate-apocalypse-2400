import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock

from app.models import Company, Contract, CompanyState, DecisionLog
from app.services.client_negotiation_service import (
    get_q2_subordinate_briefing,
    get_or_create_negotiation_session,
    submit_q2_subordinate_choice,
    get_scheduled_followup_deal,
)
from app.services.board_service import check_board_prerequisites


def make_scalar_mock(val):
    res = MagicMock()
    res.scalar_one_or_none.return_value = val
    return res


def make_scalars_mock(val):
    res = MagicMock()
    scalars_mock = MagicMock()
    scalars_mock.all.return_value = val
    res.scalars.return_value = scalars_mock
    return res


def test_q2_subordinate_briefing_structure():
    """Verify Q2 subordinate briefing contains exact title and 3 choices."""
    scenario = {
        "client_name": "Titan Infrastructure Core",
        "stage_2_discovery": {
            "budget_expectation": 40000.0,
            "deliverables": "Autonomous Transit Infrastructure",
            "timeline": "60 Days",
        },
    }
    briefing = get_q2_subordinate_briefing(scenario)

    assert briefing["speaker_title"] == "Director of Commercial Accounts (Director of CA)"
    assert briefing["client_name"] == "Titan Infrastructure Core"
    assert briefing["client_budget"] == 40000.0
    assert briefing["delivery_cost"] == 22000.0  # 55% of 40,000
    assert len(briefing["choices"]) == 3

    tiers = [c["tier"] for c in briefing["choices"]]
    assert tiers == ["conservative", "balanced", "aggressive"]

    cons = next(c for c in briefing["choices"] if c["tier"] == "conservative")
    assert cons["quoted_price"] == 36000.0  # 90%
    assert cons["projected_margin"] == round(36000.0 * 0.85 - 22000.0, -2)

    bal = next(c for c in briefing["choices"] if c["tier"] == "balanced")
    assert bal["quoted_price"] == 42000.0  # 105%

    agg = next(c for c in briefing["choices"] if c["tier"] == "aggressive")
    assert agg["quoted_price"] == 50000.0  # 125%


@pytest.mark.asyncio
async def test_q2_negotiation_session_returns_briefing():
    """Verify get_or_create_negotiation_session in Q2 provides subordinate briefing."""
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Helios Dynamic", sector="Cybersecurity")
    contract_id = uuid.uuid4()
    contract = Contract(
        id=contract_id,
        company_id=company_id,
        quarter=2,
        client_name="Titan Infrastructure",
        client_type="Enterprise",
        status="stage_1_requirement",
        value=40000.0,
        relationship_score=50.0,
    )
    state = CompanyState(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=2,
        cash=50000.0,
        revenue=30000.0,
        client_satisfaction=50.0,
        market_share=5.0,
        brand=50.0,
        innovation=50.0,
        risk=20.0,
    )

    db = AsyncMock()

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        if "decision_logs" in stmt_str or "decision_log" in stmt_str:
            # Check prerequisites: budget, strategic_marketing, rd_allocation present
            # but client_negotiation decision not yet committed
            if "client_negotiation" in stmt_str or "client_deal" in stmt_str:
                return make_scalar_mock(None)
            decision = DecisionLog(
                id=uuid.uuid4(),
                company_id=company_id,
                quarter=2,
                decision_type="budget",
                summary="Budget committed",
            )
            return make_scalar_mock(decision)
        elif "contracts" in stmt_str or "contract" in stmt_str:
            return make_scalar_mock(contract)
        elif "company_states" in stmt_str or "company_state" in stmt_str:
            return make_scalar_mock(state)
        return make_scalar_mock(None)

    db.execute.side_effect = side_effect

    session = await get_or_create_negotiation_session(db, company, 2)

    assert session["quarter"] == 2
    assert "subordinate_briefing" in session
    assert session["subordinate_briefing"] is not None
    assert session["subordinate_briefing"]["speaker_title"] == "Director of Commercial Accounts (Director of CA)"
    assert len(session["subordinate_briefing"]["choices"]) == 3


@pytest.mark.asyncio
async def test_submit_q2_subordinate_choice_conservative():
    """Verify selecting conservative choice deterministically resolves deal to closed_won."""
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Helios Dynamic", sector="Cybersecurity")
    contract_id = uuid.uuid4()
    contract = Contract(
        id=contract_id,
        company_id=company_id,
        quarter=2,
        client_name="Titan Infrastructure",
        client_type="Enterprise",
        status="stage_1_requirement",
        value=40000.0,
        relationship_score=50.0,
    )
    state = CompanyState(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=2,
        cash=50000.0,
        revenue=30000.0,
        client_satisfaction=50.0,
        market_share=5.0,
        brand=50.0,
        innovation=50.0,
        risk=20.0,
    )

    db = AsyncMock()

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        if "contracts" in stmt_str or "contract" in stmt_str:
            return make_scalar_mock(contract)
        elif "company_states" in stmt_str or "company_state" in stmt_str:
            return make_scalar_mock(state)
        return make_scalar_mock(None)

    db.execute.side_effect = side_effect

    res = await submit_q2_subordinate_choice(db, company, str(contract_id), "conservative")

    assert res["choice_tier"] == "conservative"
    assert res["outcome"] in ("ACCEPTED", "COUNTEROFFER")
    assert res["status"] == "closed_won"
    assert contract.status == "closed_won"
    assert res["final_revenue"] > 0
    assert res["stat_deltas"]["cash"] > 0
    assert db.add.called
    added_obj = db.add.call_args[0][0]
    assert isinstance(added_obj, DecisionLog)
    assert added_obj.decision_type == "client_negotiation"


@pytest.mark.asyncio
async def test_submit_q2_subordinate_choice_validation_errors():
    """Verify validation on invalid choice tiers, quarter mismatch, and closed contracts."""
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Helios Dynamic", sector="Cybersecurity")
    contract_id = uuid.uuid4()
    contract = Contract(
        id=contract_id,
        company_id=company_id,
        quarter=2,
        client_name="Titan Infrastructure",
        client_type="Enterprise",
        status="closed_won",
        value=40000.0,
        relationship_score=60.0,
    )

    db = AsyncMock()
    db.execute.return_value = make_scalar_mock(contract)

    # 1. Invalid tier
    with pytest.raises(ValueError, match="Invalid choice tier"):
        await submit_q2_subordinate_choice(db, company, str(contract_id), "reckless_gambit")

    # 2. Already closed
    with pytest.raises(ValueError, match="already been resolved"):
        await submit_q2_subordinate_choice(db, company, str(contract_id), "conservative")

    # 3. Wrong quarter
    contract.status = "stage_1_requirement"
    contract.quarter = 1
    with pytest.raises(ValueError, match="only available in Quarter 2"):
        await submit_q2_subordinate_choice(db, company, str(contract_id), "conservative")


@pytest.mark.asyncio
async def test_no_synthetic_contract_when_both_deals_lost():
    """
    CRITICAL REQUIREMENT:
    Remove the synthetic ₹35,000 emergency contract fallback.
    If no deal was won in Q1 and Q2, entering Q3 produces NO follow-up contract and ₹0 ongoing revenue.
    """
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Helios Dynamic", sector="Cybersecurity")

    c1 = Contract(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=1,
        client_name="Q1 Client",
        client_type="Enterprise",
        status="closed_lost",
        value=30000.0,
        relationship_score=35.0,
    )
    c2 = Contract(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=2,
        client_name="Q2 Client",
        client_type="Enterprise",
        status="closed_lost",
        value=40000.0,
        relationship_score=30.0,
    )

    db = AsyncMock()

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        if "contracts" in stmt_str:
            # Return closed_lost contracts
            if "quarter == 1" in stmt_str or "quarter = 1" in stmt_str:
                return make_scalar_mock(None)
            if "quarter == 2" in stmt_str or "quarter = 2" in stmt_str:
                return make_scalar_mock(None)
            return make_scalars_mock([c1, c2])
        elif "decision_logs" in stmt_str or "decision_log" in stmt_str:
            # Ops budget committed
            decision = DecisionLog(
                id=uuid.uuid4(),
                company_id=company_id,
                quarter=3,
                decision_type="budget",
                summary="Budget committed",
            )
            return make_scalars_mock([decision])
        return make_scalar_mock(None)

    db.execute.side_effect = side_effect

    # 1. get_scheduled_followup_deal returns None
    scheduled = await get_scheduled_followup_deal(db, company, 3)
    assert scheduled is None

    # 2. get_or_create_negotiation_session for Q3 returns has_followup = False, remediation = None
    session = await get_or_create_negotiation_session(db, company, 3)
    assert session["has_followup"] is False
    assert session["remediation"] is None
    assert session["total_active_contracts"] == 0
    assert session["total_ongoing_quarterly_revenue"] == 0.0
    # Crucially: no new emergency contract was added to the db!
    assert not db.add.called


@pytest.mark.asyncio
async def test_board_progression_allowed_when_no_client_deals_in_q3():
    """Verify Board progression to Q3/Q4 does not hang when no client follow-up is scheduled."""
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Helios Dynamic", sector="Cybersecurity")

    db = AsyncMock()

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        # For scheduled followup deal queries: no closed won deal exists
        if "contracts" in stmt_str or "contract" in stmt_str:
            return make_scalar_mock(None)
        # Required departments (budget, marketing, rd, press) committed:
        if "decision_logs" in stmt_str or "decision_log" in stmt_str:
            return make_scalar_mock(DecisionLog(id=uuid.uuid4(), company_id=company_id, quarter=3))
        return make_scalar_mock(None)

    db.execute.side_effect = side_effect

    ok, reason = await check_board_prerequisites(db, company, 3)
    assert ok is True, f"Failed with reason: {reason}"
    assert reason == ""
