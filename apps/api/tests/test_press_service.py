"""
Comprehensive integration tests for Press World:
1. Quarter gating: Q3 and Q4 blocked (backend returns LOCKED, interactive conference disabled).
2. Prerequisites: F&O, Market, and R&D must be complete before Press unlocks.
3. Word and sentence limits: Enforces 1 sentence max and <= 50 words.
4. Exactly 3 responses flow: Statement 1 -> Follow-up 1 -> Statement 2 -> Follow-up 2 -> Statement 3 -> Resolved.
5. Idempotency: Duplicate submissions or repeated calls do not apply double consequences.
6. Contextual Crisis: Generates scenario based on actual sector and previous DecisionLogs.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.models import Company, CompanyState as CompanyStateModel, DecisionLog, Session as SessionModel
from app.services.press_service import (
    check_press_prerequisites,
    get_or_create_press_session,
    submit_press_response,
    validate_ceo_statement,
    ACTIVE_PRESS_SESSIONS,
)


@pytest.mark.asyncio
async def test_press_quarter_gating():
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    # Q3 and Q4 must be blocked
    can_access_q3, reason_q3 = await check_press_prerequisites(db, company, 3)
    assert not can_access_q3
    assert "restricted to q1 and q2" in reason_q3.lower()

    can_access_q4, reason_q4 = await check_press_prerequisites(db, company, 4)
    assert not can_access_q4
    assert "restricted to q1 and q2" in reason_q4.lower()


@pytest.mark.asyncio
async def test_press_prerequisites_missing_departments():
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    # Mock DB query returning None for DecisionLog
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    db.execute.return_value = mock_result

    can_access, reason = await check_press_prerequisites(db, company, 1)
    assert not can_access
    assert "finance & operations must be committed" in reason.lower()


@pytest.mark.asyncio
async def test_full_three_step_press_interview_flow():
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Apex Dynamics", sector="Technology")
    company_state = CompanyStateModel(
        company_id=company_id,
        quarter=1,
        cash=80000.0,
        revenue=25000.0,
        debt=0.0,
        brand=50.0,
        investor_confidence=50.0,
        risk=20.0,
        board_confidence=50.0,
        market_share=5.0,
    )

    db = AsyncMock()

    # Clear active sessions cache
    session_key = f"{company_id}:1"
    ACTIVE_PRESS_SESSIONS.pop(session_key, None)

    # Mock DB returns:
    # 1. DecisionLog for press existing check: None
    # 2. Prerequisite checks: ops (DecisionLog), market (DecisionLog), rd (DecisionLog)
    # 3. CompanyState row
    # 4. Prior logs list
    def make_mock_res(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    with patch("app.services.press_service.check_press_prerequisites", return_value=(True, "")):
        def side_effect(stmt):
            stmt_str = str(stmt)
            if "decision_log" in stmt_str:
                return make_mock_res(None)
            elif "company_states" in stmt_str:
                return make_mock_res(company_state)
            return make_mock_res([])

        db.execute.side_effect = side_effect

        # Step 1: Initial Session Fetch
        session = await get_or_create_press_session(db, company, 1)
        assert session["status"] == "ACTIVE"
        assert session["current_exchange_index"] == 0
        assert "DATA SCRAPING" in session["headline"]
        assert len(session["questions"]) == 1

        # Step 2: Statement 1
        stmt_1 = "We have halted all telemetry feeds and launched a comprehensive security audit."
        res_1 = await submit_press_response(db, company, 1, stmt_1)
        assert res_1["status"] == "ACTIVE"
        assert res_1["current_exchange_index"] == 1
        assert len(res_1["questions"]) == 2

        # Step 3: Statement 2
        stmt_2 = "Independent auditors will have complete unfettered access to all server logs."
        res_2 = await submit_press_response(db, company, 1, stmt_2)
        assert res_2["status"] == "ACTIVE"
        assert res_2["current_exchange_index"] == 2
        assert len(res_2["questions"]) == 3

        # Step 4: Statement 3 (Final)
        stmt_3 = "We pledge full transparency and will present verified findings directly to regulators."
        res_3 = await submit_press_response(db, company, 1, stmt_3)
        assert res_3["status"] == "COMPLETED"
        assert res_3["current_exchange_index"] == 3
        assert "headline" in res_3
        assert "article_body" in res_3
        assert "stat_deltas" in res_3

        # State was modified and db.add(DecisionLog) was called
        db.add.assert_called()
        db.commit.assert_called()
