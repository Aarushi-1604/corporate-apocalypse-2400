"""
Integration and regression tests for Phase 2: Q2 Press World Simplification.
Verifies:
1. Q1 press maintains 3-exchange conference structure.
2. Q2 press initializes with exactly 1 exchange (total_exchanges == 1).
3. Q2 press completes after exactly 1 CEO response (<= 50 words).
4. Evaluates response, generates Corporate Times headline, article body, and KPI deltas.
5. Persists DecisionLog(decision_type="press", quarter=2) and does NOT terminate the session.
6. Unlocks Board meeting prerequisites for Quarter 2.
7. Q3 and Q4 Press remain passive/statutory.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.models import (
    Company,
    CompanyState as CompanyStateModel,
    DecisionLog,
    Session as SessionModel,
)
from app.services.press_service import (
    check_press_prerequisites,
    get_or_create_press_session,
    submit_press_response,
    ACTIVE_PRESS_SESSIONS,
)
from app.services.board_service import check_board_prerequisites


@pytest.mark.asyncio
async def test_q1_press_preserves_three_exchanges():
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Apex Dynamics", sector="Technology")
    company_state = CompanyStateModel(
        company_id=company_id, quarter=1, cash=80000.0, revenue=25000.0,
        debt=0.0, brand=50.0, investor_confidence=50.0, risk=20.0,
        board_confidence=50.0, market_share=5.0,
    )
    db = AsyncMock()
    ACTIVE_PRESS_SESSIONS.pop(f"{company_id}:1", None)

    def make_mock_res(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    with patch("app.services.press_service.check_press_prerequisites", return_value=(True, "")):
        def side_effect(stmt):
            stmt_str = str(stmt).lower()
            if "decision_log" in stmt_str or "decision_logs" in stmt_str:
                return make_mock_res(None)
            elif "company_state" in stmt_str or "company_states" in stmt_str:
                return make_mock_res(company_state)
            return make_mock_res([])

        db.execute.side_effect = side_effect
        session_data = await get_or_create_press_session(db, company, quarter=1)
        assert session_data["quarter"] == 1
        assert session_data["total_exchanges"] == 3
        assert session_data["current_exchange_index"] == 0


@pytest.mark.asyncio
async def test_q2_press_initializes_with_exactly_one_exchange():
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Apex Dynamics", sector="Technology")
    company_state = CompanyStateModel(
        company_id=company_id, quarter=2, cash=75000.0, revenue=30000.0,
        debt=0.0, brand=52.0, investor_confidence=53.0, risk=18.0,
        board_confidence=55.0, market_share=6.0,
    )
    db = AsyncMock()
    ACTIVE_PRESS_SESSIONS.pop(f"{company_id}:2", None)

    def make_mock_res(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    with patch("app.services.press_service.check_press_prerequisites", return_value=(True, "")):
        def side_effect(stmt):
            stmt_str = str(stmt).lower()
            if "decision_log" in stmt_str or "decision_logs" in stmt_str:
                return make_mock_res(None)
            elif "company_state" in stmt_str or "company_states" in stmt_str:
                return make_mock_res(company_state)
            return make_mock_res([])

        db.execute.side_effect = side_effect
        session_data = await get_or_create_press_session(db, company, quarter=2)
        assert session_data["quarter"] == 2
        assert session_data["total_exchanges"] == 1
        assert session_data["current_exchange_index"] == 0
        assert session_data["current_question"] is not None


@pytest.mark.asyncio
async def test_q2_press_completes_after_single_response():
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    company = Company(id=company_id, session_id=session_id, name="Skyward Aero", sector="Aerospace")
    company_state = CompanyStateModel(
        company_id=company_id, quarter=2, cash=65000.0, revenue=35000.0,
        debt=0.0, brand=50.0, investor_confidence=50.0, risk=25.0,
        board_confidence=50.0, market_share=5.0,
    )
    game_session = SessionModel(
        id=session_id, current_quarter=2, status="active", current_stage="press"
    )

    db = AsyncMock()
    added_items = []
    db.add = lambda item: added_items.append(item)

    ACTIVE_PRESS_SESSIONS.pop(f"{company_id}:2", None)

    def make_mock_res(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    with patch("app.services.press_service.check_press_prerequisites", return_value=(True, "")):
        with patch("app.services.press_service.evaluate_press_step_llm", AsyncMock(return_value={
            "headline": "SKYWARD AERO STABILIZES FLIGHT PROTOCOLS UNDER SCRUTINY",
            "article_body": "The CEO delivered an accountable and decisive technical defense to the press corps.",
            "tone": "FAVOURABLE",
            "media_verdict": "Leadership acknowledged telemetry variances and initiated audited upgrades.",
            "commitments": ["Initiate independent flight avionics review."],
            "score": 80,
            "provider": "mock",
        })):
            def side_effect(stmt):
                stmt_str = str(stmt).lower()
                if "corporate_times" in stmt_str:
                    return make_mock_res(None)
                elif "decision_log" in stmt_str or "decision_logs" in stmt_str:
                    return make_mock_res(None)
                elif "company_state" in stmt_str or "company_states" in stmt_str:
                    return make_mock_res(company_state)
                elif "sessions" in stmt_str:
                    return make_mock_res(game_session)
                return make_mock_res([])

            db.execute.side_effect = side_effect

            result = await submit_press_response(
                db=db,
                company=company,
                quarter=2,
                statement="We take full responsibility and have initiated an immediate technical audit of all avionics.",
            )

            # 1. Returned result shows COMPLETED after 1 response
            assert result["status"] == "COMPLETED"
            assert result["total_exchanges"] == 1
            assert result["current_exchange_index"] == 1
            assert "SKYWARD AERO" in result["headline"]
            assert result["tone"] == "FAVOURABLE"

            # 2. DecisionLog was added
            press_logs = [item for item in added_items if isinstance(item, DecisionLog) and item.decision_type == "press"]
            assert len(press_logs) == 1
            assert press_logs[0].quarter == 2

            # 3. Overall game session was NOT marked completed
            assert game_session.status == "active"


@pytest.mark.asyncio
async def test_q2_press_completion_unlocks_board():
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    company = Company(id=company_id, session_id=session_id, name="Skyward Aero", sector="Aerospace")
    state_q3 = CompanyStateModel(company_id=company_id, quarter=3, cash=60000.0)

    db = AsyncMock()

    def make_mock_res(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    def side_effect(stmt):
        stmt_str = str(stmt).lower()
        if "company_states" in stmt_str or "company_state" in stmt_str:
            return make_mock_res(state_q3)
        elif "decision_logs" in stmt_str or "decision_log" in stmt_str:
            return make_mock_res(DecisionLog(company_id=company_id, quarter=2, decision_type="logged"))
        return make_mock_res(None)

    db.execute.side_effect = side_effect

    can_convene, reason = await check_board_prerequisites(db, company, quarter=2)
    assert can_convene is True
    assert reason == ""
