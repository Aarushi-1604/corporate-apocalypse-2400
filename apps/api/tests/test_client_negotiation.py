"""
Unit tests for Client World LLM Negotiation Fallback and Deterministic Engine
Tests:
1. Groq success -> Gemini is NOT called.
2. Simulated Groq HTTP 429 -> Gemini responds immediately.
3. Simulated Groq timeout -> Gemini responds immediately.
4. Simulated malformed Groq JSON -> Gemini responds immediately.
5. Both providers fail -> deterministic heuristic scoring succeeds.
6. Deterministic deal resolution branches: Accepted, Counteroffer, Rejected, Walked Away.
7. Price and stage validation constraints.
"""

import pytest
import httpx
from unittest.mock import AsyncMock

from app.services.llm_negotiation_service import evaluate_client_pitch, deterministic_pitch_evaluation
from app.services.client_negotiation_service import resolve_commercial_deal


@pytest.mark.asyncio
async def test_groq_success_gemini_not_called():
    client_info = {
        "client_name": "Halden Industrial Group",
        "client_type": "enterprise",
        "requirement": "Automated logistics routing",
        "deliverables": "Telemetry routing across 48 corridors",
        "timeline": "60 days",
        "budget": 18000.0,
    }
    company_info = {
        "company_name": "Apex Dynamics",
        "sector": "Technology",
        "innovation": 70.0,
        "brand": 65.0,
        "risk": 20.0,
    }

    mock_groq = AsyncMock(return_value={
        "score": 85,
        "client_reaction": "Excellent architectural proposal.",
        "trust_delta": 8,
        "suggested_price_multiplier": 1.15,
        "provider": "groq",
    })
    mock_gemini = AsyncMock()

    result = await evaluate_client_pitch(
        pitch="We will deploy distributed routing nodes with real-time failover across your 48 transit corridors.",
        client_info=client_info,
        company_info=company_info,
        groq_caller=mock_groq,
        gemini_caller=mock_gemini,
    )

    assert result["provider"] == "groq"
    assert result["score"] == 85
    assert result["trust_delta"] == 8
    mock_groq.assert_called_once()
    mock_gemini.assert_not_called()


@pytest.mark.asyncio
async def test_groq_429_immediate_gemini_fallback():
    client_info = {"client_name": "Meridian Civic Authority", "budget": 22000.0}
    company_info = {"company_name": "Apex Dynamics", "innovation": 60.0}

    # Simulate Groq 429 Rate Limit
    req = httpx.Request("POST", "https://api.groq.com")
    resp = httpx.Response(429, text="Rate limit exceeded", request=req)
    mock_groq = AsyncMock(side_effect=httpx.HTTPStatusError("429 Too Many Requests", request=req, response=resp))

    mock_gemini = AsyncMock(return_value={
        "score": 78,
        "client_reaction": "Gemini fallback evaluation accepted.",
        "trust_delta": 5,
        "suggested_price_multiplier": 1.05,
        "provider": "gemini",
    })

    result = await evaluate_client_pitch(
        pitch="Our SCADA redundancy grid guarantees 99.9% uptime compliance.",
        client_info=client_info,
        company_info=company_info,
        groq_caller=mock_groq,
        gemini_caller=mock_gemini,
    )

    assert result["provider"] == "gemini"
    assert result["score"] == 78
    mock_groq.assert_called_once()
    mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_groq_timeout_immediate_gemini_fallback():
    client_info = {"client_name": "Continental Freight", "budget": 25000.0}
    company_info = {"company_name": "Apex Dynamics"}

    mock_groq = AsyncMock(side_effect=httpx.ReadTimeout("Groq read timed out"))
    mock_gemini = AsyncMock(return_value={
        "score": 82,
        "client_reaction": "Evaluated successfully by Gemini after Groq timeout.",
        "trust_delta": 6,
        "suggested_price_multiplier": 1.10,
        "provider": "gemini",
    })

    result = await evaluate_client_pitch(
        pitch="End-to-end cryptographic manifest tracking with instant failover.",
        client_info=client_info,
        company_info=company_info,
        groq_caller=mock_groq,
        gemini_caller=mock_gemini,
    )

    assert result["provider"] == "gemini"
    assert result["score"] == 82
    mock_groq.assert_called_once()
    mock_gemini.assert_called_once()


@pytest.mark.asyncio
async def test_groq_malformed_json_fallback_to_gemini():
    client_info = {"client_name": "Continental Freight", "budget": 25000.0}
    company_info = {"company_name": "Apex Dynamics"}

    mock_groq = AsyncMock(side_effect=ValueError("Invalid JSON from Groq"))
    mock_gemini = AsyncMock(return_value={
        "score": 74,
        "client_reaction": "Gemini resolved cleanly.",
        "trust_delta": 4,
        "suggested_price_multiplier": 1.0,
        "provider": "gemini",
    })

    result = await evaluate_client_pitch(
        pitch="We provide reliable hardware security modules.",
        client_info=client_info,
        company_info=company_info,
        groq_caller=mock_groq,
        gemini_caller=mock_gemini,
    )

    assert result["provider"] == "gemini"
    assert result["score"] == 74


@pytest.mark.asyncio
async def test_both_providers_fail_deterministic_fallback():
    client_info = {
        "client_name": "Halden Industrial Group",
        "requirement": "Automated logistics routing",
        "deliverables": "Telemetry routing across 48 corridors",
        "budget": 18000.0,
    }
    company_info = {"company_name": "Apex Dynamics", "innovation": 65.0, "brand": 60.0}

    mock_groq = AsyncMock(side_effect=httpx.ConnectError("Groq offline"))
    mock_gemini = AsyncMock(side_effect=httpx.ConnectError("Gemini offline"))

    result = await evaluate_client_pitch(
        pitch="We provide high efficiency automated routing infrastructure and security compliance across all corridors.",
        client_info=client_info,
        company_info=company_info,
        groq_caller=mock_groq,
        gemini_caller=mock_gemini,
    )

    assert result["provider"] == "deterministic_fallback"
    assert 30 <= result["score"] <= 100
    assert -15 <= result["trust_delta"] <= 15
    assert len(result["client_reaction"]) > 10


def test_deterministic_deal_resolution_accepted():
    capabilities = {"brand": 60.0, "innovation": 70.0, "risk": 20.0}
    outcome, final_revenue, explanation, deltas = resolve_commercial_deal(
        quoted_price=18000.0,
        budget_expectation=18000.0,
        pitch_score=85,
        relationship_score=60.0,
        company_capabilities=capabilities,
    )
    assert outcome == "ACCEPTED"
    assert final_revenue == 18000.0
    assert deltas["revenue"] == 18000.0
    assert deltas["cash"] > 0
    assert deltas["client_satisfaction"] > 0


def test_deterministic_deal_resolution_counteroffer():
    capabilities = {"brand": 50.0, "innovation": 55.0, "risk": 25.0}
    outcome, final_revenue, explanation, deltas = resolve_commercial_deal(
        quoted_price=24000.0,
        budget_expectation=18000.0,
        pitch_score=75,
        relationship_score=55.0,
        company_capabilities=capabilities,
    )
    assert outcome == "COUNTEROFFER"
    assert 18000.0 <= final_revenue < 24000.0
    assert deltas["revenue"] == final_revenue


def test_deterministic_deal_resolution_walked_away():
    capabilities = {"brand": 40.0, "innovation": 40.0, "risk": 30.0}
    outcome, final_revenue, explanation, deltas = resolve_commercial_deal(
        quoted_price=60000.0,  # > 3x budget
        budget_expectation=18000.0,
        pitch_score=40,
        relationship_score=35.0,
        company_capabilities=capabilities,
    )
    assert outcome == "WALKED_AWAY"
    assert final_revenue == 0.0
    assert deltas["client_satisfaction"] < 0


@pytest.mark.asyncio
async def test_passive_client_portfolio_carry_forward_q3():
    import uuid
    from unittest.mock import MagicMock
    from app.models import Company, Contract, DecisionLog
    from app.services.client_negotiation_service import get_or_create_negotiation_session

    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Apex Dynamics", sector="Technology")

    c1 = Contract(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=1,
        client_name="Halden Industrial Group",
        client_type="enterprise",
        value=20000.0,
        status="closed_won",
        relationship_score=75.0,
    )
    c2 = Contract(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=2,
        client_name="Meridian Civic Authority",
        client_type="civic",
        value=30000.0,
        status="closed_won",
        relationship_score=30.0,  # Below 35 -> formal dispute
    )

    log1 = DecisionLog(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=1,
        decision_type="client_deal",
        summary="Deal closed won for ₹20,000",
    )

    db = AsyncMock()

    def make_scalars_mock(val):
        res = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val
        res.scalars.return_value = scalars_mock
        return res

    def side_effect(stmt):
        stmt_str = str(stmt)
        if "contracts" in stmt_str:
            return make_scalars_mock([c1, c2])
        elif "decision_logs" in stmt_str or "decision_log" in stmt_str:
            return make_scalars_mock([log1])
        return make_scalars_mock([])

    db.execute.side_effect = side_effect

    # Fetch Q3 negotiation session
    session = await get_or_create_negotiation_session(db, company, 3)

    assert session["status"] == "PASSIVE_PORTFOLIO"
    assert session["total_active_contracts"] == 2
    assert session["total_contract_value"] == 50000.0
    assert session["total_ongoing_quarterly_revenue"] == 7500.0  # 15% of 50000
    assert len(session["active_portfolio"]) == 2

    # Check contract 1
    p1 = session["active_portfolio"][0]
    assert p1["client_name"] == "Halden Industrial Group"
    assert p1["ongoing_quarterly_revenue"] == 3000.0
    assert "NOMINAL" in p1["dispute_status"]

    # Check contract 2 (relationship score 30 -> formal contract dispute)
    p2 = session["active_portfolio"][1]
    assert p2["client_name"] == "Meridian Civic Authority"
    assert p2["ongoing_quarterly_revenue"] == 4500.0
    assert "FORMAL CONTRACT DISPUTE" in p2["dispute_status"]

    # Verify remediation inquiry presence and base floor calculation
    assert "remediation" in session
    assert session["remediation"]["base_amount"] >= 5000.0
    assert session["remediation"]["client_name"] == "Meridian Civic Authority"
    assert "remediation compensation rebate" in session["remediation"]["audit_feedback"]


@pytest.mark.asyncio
async def test_submit_client_remediation_validation_below_floor():
    import uuid
    from unittest.mock import MagicMock
    from app.models import Company, Contract, CompanyState
    from app.services.client_negotiation_service import submit_client_remediation

    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Skyward Aero", sector="Aerospace")
    contract_id = uuid.uuid4()
    contract = Contract(
        id=contract_id,
        company_id=company_id,
        quarter=1,
        client_name="Starline Transport",
        client_type="aviation",
        value=30000.0,
        status="closed_won",
        relationship_score=70.0,
    )
    state = CompanyState(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=3,
        cash=50000.0,
        client_satisfaction=60.0,
        brand=55.0,
        risk=25.0,
        esg=50.0,
    )

    db = AsyncMock()

    # Base floor for 30,000 contract is 20% = 6,000.
    # Trying to compensate 4,000 should raise ValueError.
    def mock_scalar_one_or_none(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        return res

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        if "decision_logs" in stmt_str or "decision_log" in stmt_str:
            return mock_scalar_one_or_none(None)  # not settled yet
        elif "company_states" in stmt_str or "company_state" in stmt_str:
            return mock_scalar_one_or_none(state)
        elif "contracts" in stmt_str or "contract" in stmt_str:
            return mock_scalar_one_or_none(contract)
        return mock_scalar_one_or_none(None)

    db.execute.side_effect = side_effect

    with pytest.raises(ValueError, match="cannot be lower than the base demand"):
        await submit_client_remediation(
            db=db,
            company=company,
            quarter=3,
            contract_id=str(contract_id),
            compensation_amount=4000.0,
            status_update="Testing below floor",
        )


@pytest.mark.asyncio
async def test_submit_client_remediation_success():
    import uuid
    from unittest.mock import MagicMock
    from app.models import Company, Contract, CompanyState
    from app.services.client_negotiation_service import submit_client_remediation

    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Skyward Aero", sector="Aerospace")
    contract_id = uuid.uuid4()
    contract = Contract(
        id=contract_id,
        company_id=company_id,
        quarter=1,
        client_name="Starline Transport",
        client_type="aviation",
        value=30000.0,
        status="closed_won",
        relationship_score=70.0,
    )
    state = CompanyState(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=3,
        cash=50000.0,
        client_satisfaction=60.0,
        brand=55.0,
        risk=25.0,
        esg=50.0,
    )

    db = AsyncMock()
    db.add = MagicMock()

    def mock_scalar_one_or_none(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        return res

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        if "decision_logs" in stmt_str or "decision_log" in stmt_str:
            return mock_scalar_one_or_none(None)
        elif "company_states" in stmt_str or "company_state" in stmt_str:
            return mock_scalar_one_or_none(state)
        elif "contracts" in stmt_str or "contract" in stmt_str:
            return mock_scalar_one_or_none(contract)
        return mock_scalar_one_or_none(None)

    db.execute.side_effect = side_effect

    # Base is 6,000. Compensate 10,000 (higher than base)
    result = await submit_client_remediation(
        db=db,
        company=company,
        quarter=3,
        contract_id=str(contract_id),
        compensation_amount=10000.0,
        status_update="Dedicated engineers deployed to guarantee SLA milestones.",
    )

    assert result["status"] == "SETTLED"
    assert result["compensation_amount"] == 10000.0
    assert result["base_amount"] == 6000.0
    assert result["new_cash"] == 40000.0
    assert result["new_client_satisfaction"] > 60.0
    assert result["new_brand"] > 55.0
    assert result["new_risk"] < 25.0
    assert "SLA Audit Settlement with Starline Transport" in result["summary"]

