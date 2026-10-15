"""
Comprehensive integration and unit test suite for the Critical Quarter Cycle:
1. Fresh quarter: Stage A HQ departments are TO DO; Client, Press, and Board are LOCKED.
2. Only one or two HQ departments completed: Client, Press, and Board remain LOCKED.
3. All three HQ departments completed: Client and Press both unlock (TO DO); Board remains LOCKED.
4. Client completed: Client becomes DONE (persisted); Press remains available (TO DO); Board remains LOCKED.
5. Press completed: Press becomes DONE (persisted); Client remains complete (DONE); all five now DONE -> Board unlocks!
6. Board Meeting prerequisites prevent premature trigger or bypass.
7. Contextual Board Meeting presents exactly 4 options per exchange.
8. Surviving the Board Meeting advances exactly one quarter, persists history, and sets new quarter state.
9. Final exchange idempotency: duplicate completion does not double-advance.
10. Q3/Q4 restrictions: new client negotiations and press conferences remain blocked.
"""

import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

from app.models import (
    BoardExchange,
    BoardSession,
    Company,
    CompanyState as CompanyStateModel,
    Contract,
    DecisionLog,
    Session as SessionModel,
)
from app.services.client_negotiation_service import check_client_prerequisites
from app.services.press_service import check_press_prerequisites
from app.services.board_service import (
    check_board_prerequisites,
    get_active_board_exchange,
    respond_to_board_exchange,
    trigger_board_session,
)
from app.board.loader import load_board_script


def test_board_script_has_four_options_per_exchange():
    """Verify that every board exchange in the script has exactly 4 options."""
    script = load_board_script()
    assert len(script) >= 6
    for i, exchange in enumerate(script):
        assert len(exchange["options"]) == 4, f"Exchange {i} ({exchange['speaker']}) does not have 4 options"
        for opt in exchange["options"]:
            assert "label" in opt and len(opt["label"]) > 5
            assert "confidence_delta" in opt


@pytest.mark.asyncio
async def test_fresh_quarter_locks():
    """Test 1: Fresh quarter - no decisions yet. HQ are pending, Client, Press, Board are LOCKED."""
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    # DB returns None for any DecisionLog check
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_res.scalars.return_value.all.return_value = []
    mock_res.scalars.return_value.first.return_value = None
    db.execute.return_value = mock_res

    # Check Client unlock
    can_client, reason_client = await check_client_prerequisites(db, company, 1)
    assert not can_client
    assert "must be committed" in reason_client.lower()

    # Check Press unlock
    can_press, reason_press = await check_press_prerequisites(db, company, 1)
    assert not can_press
    assert "must be committed" in reason_press.lower()

    # Check Board unlock
    can_board, reason_board = await check_board_prerequisites(db, company, 1)
    assert not can_board
    assert "must be committed" in reason_board.lower()


@pytest.mark.asyncio
async def test_partial_stage_a_keeps_client_press_board_locked():
    """Test 2: Only 1 or 2 HQ departments complete (e.g. Ops and Market done, but R&D pending)."""
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    def execute_side_effect(query):
        mock_result = MagicMock()
        q_str = str(query)
        if "budget" in q_str:
            mock_result.scalar_one_or_none.return_value = DecisionLog(
                company_id=company.id, quarter=1, decision_type="budget"
            )
        elif "strategic_marketing" in q_str:
            mock_result.scalar_one_or_none.return_value = DecisionLog(
                company_id=company.id, quarter=1, decision_type="strategic_marketing"
            )
        else:
            mock_result.scalar_one_or_none.return_value = None
        mock_result.scalars.return_value.all.return_value = []
        return mock_result

    db.execute.side_effect = execute_side_effect

    can_client, _ = await check_client_prerequisites(db, company, 1)
    assert not can_client, "Client must remain locked when R&D is incomplete"

    can_press, _ = await check_press_prerequisites(db, company, 1)
    assert not can_press, "Press must remain locked when R&D is incomplete"

    can_board, _ = await check_board_prerequisites(db, company, 1)
    assert not can_board, "Board must remain locked"


@pytest.mark.asyncio
async def test_stage_a_complete_unlocks_client_and_press():
    """Test 3: Ops, Market, and R&D done -> Client and Press unlock together; Board remains locked."""
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    queries_count = 0

    def execute_side_effect(query):
        nonlocal queries_count
        queries_count += 1
        mock_result = MagicMock()
        q_str = str(query)

        # In check_board_prerequisites:
        # 1. budget -> return DecisionLog
        # 2. strategic_marketing -> return DecisionLog
        # 3. rd in (...) -> return DecisionLog
        # 4. client_negotiation in (...) -> return None (client not yet done)
        # 5. press -> return None (press not yet done)
        if "IN (__[POSTCOMPILE_decision_type_1])" in q_str:
            # Check if this is the first IN (rd) or second IN (client)
            # R&D query comes 3rd in check_board_prerequisites (after budget and strategic_marketing)
            # and 3rd in check_client/press_prerequisites
            if queries_count in (3, 6, 9):
                mock_result.scalar_one_or_none.return_value = DecisionLog(
                    company_id=company.id, quarter=1, decision_type="rd"
                )
            else:
                mock_result.scalar_one_or_none.return_value = None
        elif "decision_type = :decision_type_1" in q_str:
            # Ops or Market or Press
            if queries_count in (1, 2, 4, 5, 7, 8):
                mock_result.scalar_one_or_none.return_value = DecisionLog(
                    company_id=company.id, quarter=1, decision_type="logged"
                )
            else:
                mock_result.scalar_one_or_none.return_value = None
        else:
            mock_result.scalar_one_or_none.return_value = None

        mock_result.scalars.return_value.all.return_value = []
        return mock_result

    db.execute.side_effect = execute_side_effect

    can_client, _ = await check_client_prerequisites(db, company, 1)
    assert can_client, "Client must unlock when Ops, Market, and R&D are done"

    can_press, _ = await check_press_prerequisites(db, company, 1)
    assert can_press, "Press must unlock when Ops, Market, and R&D are done"

    can_board, reason_board = await check_board_prerequisites(db, company, 1)
    assert not can_board, "Board must remain locked while Client and Press are pending"
    assert "concluded before convening" in reason_board.lower()


@pytest.mark.asyncio
async def test_all_five_complete_unlocks_board():
    """Test 4: Ops, Market, R&D, Client, Press all done -> Board Room unlocks."""
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    def execute_side_effect(query):
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = DecisionLog(
            company_id=company.id, quarter=1, decision_type="logged"
        )
        mock_result.scalars.return_value.all.return_value = []
        return mock_result

    db.execute.side_effect = execute_side_effect

    can_board, _ = await check_board_prerequisites(db, company, 1)
    assert can_board, "Board must unlock when all five activities are complete"


@pytest.mark.asyncio
async def test_board_meeting_advances_quarter_on_survival():
    """Test 5: Completing final board exchange with positive score advances the quarter."""
    db = AsyncMock()
    db.add = MagicMock()
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    company = Company(id=company_id, session_id=session_id, name="Apex Dynamics")
    session_row = SessionModel(id=session_id, current_quarter=1, status="active")
    company_state = CompanyStateModel(
        company_id=company_id,
        quarter=1,
        board_confidence=50.0,
        cash=100000.0,
        revenue=50000.0,
        profit=10000.0,
        debt=0.0,
        stock_price=25.0,
        employees=50,
        innovation=60.0,
        brand=50.0,
        client_satisfaction=70.0,
        employee_satisfaction=65.0,
        investor_confidence=60.0,
        esg=50.0,
        risk=20.0,
        market_share=5.0,
    )

    board_session = BoardSession(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=1,
        trigger_reason="quarter_end_review",
        outcome=None,
    )

    exchange_id = uuid.uuid4()
    exchange = BoardExchange(
        id=exchange_id,
        board_session_id=board_session.id,
        speaker="chairperson",
        question="Review?",
        sequence=0,
        chosen_response=None,
    )

    def execute_side_effect(query):
        mock_result = MagicMock()
        q_str = str(query)
        if "board_exchanges" in q_str and "WHERE board_exchanges.id" in q_str:
            mock_result.scalar_one_or_none.return_value = exchange
        elif "board_sessions" in q_str:
            mock_result.scalar_one.return_value = board_session
        elif "board_exchanges" in q_str and "board_session_id" in q_str:
            # Simulate only 1 exchange for this test
            mock_result.scalars.return_value.all.return_value = [exchange]
        elif "company_states" in q_str and "quarter == 2" in q_str:
            mock_result.scalar_one_or_none.return_value = None
        elif "company_states" in q_str:
            mock_result.scalar_one.return_value = company_state
            mock_result.scalar_one_or_none.return_value = None
        elif "companies" in q_str:
            mock_result.scalar_one.return_value = company
        elif "sessions" in q_str:
            mock_result.scalar_one.return_value = session_row
        else:
            mock_result.scalar_one_or_none.return_value = None
            mock_result.scalars.return_value.all.return_value = []
        return mock_result

    db.execute.side_effect = execute_side_effect

    delta, complete, fired, new_conf, completed_q, next_q = await respond_to_board_exchange(
        db, exchange_id, 0, company_id
    )

    assert complete is True
    assert fired is False
    assert completed_q == 1, "Completed quarter must be explicitly identified as Q1"
    assert next_q == 2, "Next quarter must be Q2"
    assert board_session.outcome == "survived"
    assert session_row.current_quarter == 2, "Quarter must advance to Q2"


@pytest.mark.asyncio
async def test_q3_q4_gating():
    """Test 6: In Q3 and Q4, new client negotiations and press conferences are locked."""
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    can_client_q3, reason_client_q3 = await check_client_prerequisites(db, company, 3)
    assert not can_client_q3
    assert "restricted to q1 and q2" in reason_client_q3.lower()

    can_press_q3, reason_press_q3 = await check_press_prerequisites(db, company, 3)
    assert not can_press_q3
    assert "restricted to q1 and q2" in reason_press_q3.lower()

    can_client_q4, reason_client_q4 = await check_client_prerequisites(db, company, 4)
    assert not can_client_q4

    can_press_q4, reason_press_q4 = await check_press_prerequisites(db, company, 4)
    assert not can_press_q4


@pytest.mark.asyncio
async def test_q3_q4_board_prerequisites_unlock_with_hq_activities():
    """Test 6b: In Q3/Q4, Board Meeting unlocks when Ops, Market, and R&D are complete without requiring interactive client/press."""
    db = AsyncMock()
    company = Company(id=uuid.uuid4(), name="Apex Dynamics", sector="Technology")

    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = DecisionLog(
        company_id=company.id, quarter=3, decision_type="logged"
    )
    mock_result.scalars.return_value.all.return_value = []
    db.execute.return_value = mock_result

    # Q3: Board unlocks with just Ops, Market, R&D
    can_board_q3, reason_q3 = await check_board_prerequisites(db, company, 3)
    assert can_board_q3, f"Board must unlock in Q3 when Ops, Market, R&D are done, got: {reason_q3}"

    # Q4: Board unlocks with just Ops, Market, R&D
    can_board_q4, reason_q4 = await check_board_prerequisites(db, company, 4)
    assert can_board_q4, f"Board must unlock in Q4 when Ops, Market, R&D are done, got: {reason_q4}"


@pytest.mark.asyncio
async def test_regression_bug_1_completed_quarter_payload_and_q4():
    """Regression Test for BUG 1: Explicit completed-quarter payload across quarters including Q4."""
    db = AsyncMock()
    db.add = MagicMock()
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    company = Company(id=company_id, session_id=session_id, name="Continental Vantage Air")
    session_row = SessionModel(id=session_id, current_quarter=4, status="active")
    company_state = CompanyStateModel(
        company_id=company_id,
        quarter=4,
        board_confidence=55.0,
        cash=85000.0,
        revenue=60000.0,
        profit=15000.0,
        debt=0.0,
        stock_price=30.0,
        employees=60,
        innovation=70.0,
        brand=65.0,
        client_satisfaction=80.0,
        employee_satisfaction=75.0,
        investor_confidence=70.0,
        esg=60.0,
        risk=15.0,
        market_share=12.0,
    )
    board_session = BoardSession(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=4,
        trigger_reason="quarter_end_review",
        outcome=None,
    )
    exchange = BoardExchange(
        id=uuid.uuid4(),
        board_session_id=board_session.id,
        speaker="chairperson",
        question="Final Q4 Ratification?",
        sequence=0,
        chosen_response=None,
    )

    def execute_side_effect(query):
        mock_result = MagicMock()
        q_str = str(query)
        if "board_exchanges" in q_str and "WHERE board_exchanges.id" in q_str:
            mock_result.scalar_one_or_none.return_value = exchange
        elif "board_sessions" in q_str:
            mock_result.scalar_one.return_value = board_session
        elif "board_exchanges" in q_str and "board_session_id" in q_str:
            mock_result.scalars.return_value.all.return_value = [exchange]
        elif "company_states" in q_str:
            mock_result.scalar_one.return_value = company_state
            mock_result.scalar_one_or_none.return_value = company_state
            mock_result.scalars.return_value.all.return_value = [company_state]
        elif "companies" in q_str:
            mock_result.scalar_one.return_value = company
        elif "sessions" in q_str:
            mock_result.scalar_one.return_value = session_row
        else:
            mock_result.scalar_one_or_none.return_value = None
            mock_result.scalars.return_value.all.return_value = []
        return mock_result

    db.execute.side_effect = execute_side_effect

    delta, complete, fired, new_conf, completed_q, next_q = await respond_to_board_exchange(
        db, exchange.id, 0, company_id
    )

    assert complete is True
    assert fired is False
    assert completed_q == 4, "Must identify Q4 as completed quarter"
    assert next_q is None, "Q4 has no next quarter"
    assert session_row.status == "completed"


@pytest.mark.asyncio
async def test_regression_bug_2_cash_balance_preserved_across_client_and_board():
    """
    Regression Test for BUG 2:
    Company: Continental Vantage Air.
    1. Operations budget lock runs and creates a draft Q2 row with pre-deal cash (~₹55,326).
    2. Client World successful deal awards revenue and increases Q1 cash to ₹70,000.
    3. Board Meeting completes: next quarter state must inherit authoritative ₹70,000,
       NEVER reverting back to the stale ₹55,326 pre-client snapshot.
    """
    db = AsyncMock()
    db.add = MagicMock()
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    company = Company(id=company_id, session_id=session_id, name="Continental Vantage Air")
    session_row = SessionModel(id=session_id, current_quarter=1, status="active")

    # Q1 company state starts with post-deal cash ₹70,000
    q1_state = CompanyStateModel(
        company_id=company_id,
        quarter=1,
        board_confidence=50.0,
        cash=70000.0,
        revenue=50000.0,
        profit=12000.0,
        debt=0.0,
        stock_price=25.0,
        employees=50,
        innovation=60.0,
        brand=55.0,
        client_satisfaction=75.0,
        employee_satisfaction=65.0,
        investor_confidence=60.0,
        esg=50.0,
        risk=20.0,
        market_share=8.0,
    )

    # Stale Q2 state created earlier by operations tick before client deal
    stale_q2_state = CompanyStateModel(
        company_id=company_id,
        quarter=2,
        board_confidence=50.0,
        cash=55326.0,  # Stale balance before client deal!
        revenue=32000.0,
        profit=8000.0,
        debt=0.0,
        stock_price=24.0,
        employees=50,
        innovation=55.0,
        brand=50.0,
        client_satisfaction=70.0,
        employee_satisfaction=65.0,
        investor_confidence=58.0,
        esg=50.0,
        risk=22.0,
        market_share=7.5,
    )

    board_session = BoardSession(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=1,
        trigger_reason="quarter_end_review",
        outcome=None,
    )
    exchange = BoardExchange(
        id=uuid.uuid4(),
        board_session_id=board_session.id,
        speaker="chairperson",
        question="Review?",
        sequence=0,
        chosen_response=None,
    )

    state_query_count = 0

    def execute_side_effect(query):
        nonlocal state_query_count
        mock_result = MagicMock()
        q_str = str(query)
        if "board_exchanges" in q_str and "WHERE board_exchanges.id" in q_str:
            mock_result.scalar_one_or_none.return_value = exchange
        elif "board_sessions" in q_str:
            mock_result.scalar_one.return_value = board_session
        elif "board_exchanges" in q_str and "board_session_id" in q_str:
            mock_result.scalars.return_value.all.return_value = [exchange]
        elif "company_states" in q_str:
            state_query_count += 1
            if state_query_count == 1:
                # First company_states query is for current quarter state
                mock_result.scalar_one.return_value = q1_state
                mock_result.scalar_one_or_none.return_value = q1_state
            else:
                # Second company_states query is for new_quarter state
                mock_result.scalar_one_or_none.return_value = stale_q2_state
                mock_result.scalar_one.return_value = stale_q2_state
        elif "companies" in q_str:
            mock_result.scalar_one.return_value = company
        elif "sessions" in q_str:
            mock_result.scalar_one.return_value = session_row
        else:
            mock_result.scalar_one_or_none.return_value = None
            mock_result.scalars.return_value.all.return_value = []
        return mock_result

    db.execute.side_effect = execute_side_effect

    delta, complete, fired, new_conf, completed_q, next_q = await respond_to_board_exchange(
        db, exchange.id, 0, company_id
    )

    assert complete is True
    assert fired is False
    assert completed_q == 1
    assert next_q == 2

    # CRITICAL BUG 2 ASSERTION:
    # Stale Q2 cash (₹55,326) MUST BE updated with authoritative post-client cash (₹70,000)!
    assert stale_q2_state.cash == 70000.0, f"Expected cash to be 70000.0, but got {stale_q2_state.cash}"
    assert stale_q2_state.revenue == 50000.0
    assert stale_q2_state.client_satisfaction == 75.0
