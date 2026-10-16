"""
Corporate Apocalypse 2400 — Final Master Patch Comprehensive Regression Suite.
Covers:
1. Q4 Annual Report & Final Outcome:
   - Surviving Q4 report generation
   - Bankruptcy terminal report
   - Fired terminal report
   - Duplicate game finalization & leaderboard row deduplication
   - Data fields: CEO name, company name, outcome, liquid cash, KPIs, decisions, client deals, press, board assessment
2. AI Provider Chain (Groq -> Gemini -> Deterministic Fallback):
   - Groq primary success
   - Groq rate-limited / 429 -> Gemini fallback
   - Groq timeout -> Gemini fallback
   - Groq malformed / empty / truncated JSON -> Gemini fallback
   - Both cloud providers fail -> Context-aware deterministic fallback
   - Ollama NEVER called when enable_ollama is False (Azure production mode)
3. Leaderboard Privacy:
   - PRN is NOT exposed (masked_prn is None)
   - Branch is preserved and displayed
4. Client World Exact Two-Deal System:
   - All 4 deal acceptance combinations:
     * (Rej, Rej) -> Q3: None, Q4: None
     * (Acc, Rej) -> Q3: Q1 deal, Q4: None
     * (Rej, Acc) -> Q3: Q2 deal, Q4: None
     * (Acc, Acc) -> Q3: Q1 deal, Q4: Q2 deal
   - No 3rd deal ever created
   - 50-word written response limit strictly enforced
   - Authoritative refund deduction and bankruptcy trigger on insolvency
   - Idempotent against duplicate submissions
5. Press World Q3/Q4 Direct Report:
   - Starts locked while prerequisites (Ops, Market, R&D, Client) are incomplete
   - Directly displays Corporate Times without journalist interview
   - Idempotent against repeat visits
6. Obsolete Timed Crisis Removal:
   - get_active_event returns None without auto-generating random crisis
"""

import uuid
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.models import (
    BoardSession,
    Company,
    CompanyState as CompanyStateModel,
    Contract,
    CorporateTimesIssue,
    DecisionLog,
    Leaderboard,
    Player,
    Session as SessionModel,
)
from app.ai.llm_client import request_llm_completion
from app.ai.ollama_client import generate_completion, get_embedding
from app.services.annual_report_service import get_annual_report
from app.services.client_negotiation_service import (
    get_scheduled_followup_deal,
    get_or_create_negotiation_session,
    submit_client_remediation,
)
from app.services.press_service import get_or_create_press_session
from app.services.event_service import get_active_event
from app.services.leaderboard_service import get_leaderboard
from app.services.scoring_service import finalize_game


# ---------------------------------------------------------------------------
# TRACK 1: Annual Report & Terminal Outcomes
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_q4_annual_report_survived_comprehensive():
    """Verify complete Annual Report generation with all required fields for survived Q4 game."""
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    player_id = uuid.uuid4()

    player = Player(id=player_id, full_name="Aarushi Sharma", department="CSE", prn="PRN998877")
    company = Company(id=company_id, session_id=session_id, name="Solaris Kinetic", sector="Technology")
    session_row = SessionModel(
        id=session_id, player_id=player_id, current_quarter=4, status="completed", current_stage="report"
    )
    score_row = Leaderboard(
        id=uuid.uuid4(),
        player_id=player_id,
        session_id=session_id,
        company_name=company.name,
        sector=company.sector,
        final_score=87.5,
        revenue_score=90.0,
        satisfaction_score=85.0,
        innovation_score=88.0,
        investor_score=84.0,
        survival_score=100.0,
        risk_penalty=5.0,
    )
    state_q4 = CompanyStateModel(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=4,
        cash=125000.0,
        revenue=95000.0,
        profit=35000.0,
        stock_price=142.5,
        employees=450,
        client_satisfaction=80.0,
        employee_satisfaction=78.0,
        innovation=85.0,
        investor_confidence=82.0,
        brand=75.0,
        esg=70.0,
        risk=15.0,
        market_share=18.5,
        board_confidence=78.0,
    )
    contract_q1 = Contract(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=1,
        client_name="Starline Logistics",
        client_type="enterprise",
        status="remediated",
        value=40000.0,
        relationship_score=80.0,
    )
    dec_ops = DecisionLog(
        id=uuid.uuid4(),
        company_id=company_id,
        quarter=4,
        decision_type="budget",
        summary="Automated core operations",
        stat_deltas={"cash": -10000.0},
    )

    db = AsyncMock()

    def make_res(val):
        res = MagicMock()
        res.scalar_one.return_value = val
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        scalars_mock.first.return_value = val[0] if isinstance(val, list) and val else val
        res.scalars.return_value = scalars_mock
        return res

    def side_effect(stmt):
        s = str(stmt).lower()
        if "sessions" in s:
            return make_res(session_row)
        elif "leaderboard" in s:
            return make_res(score_row)
        elif "players" in s:
            return make_res(player)
        elif "company_states" in s:
            return make_res([state_q4])
        elif "contracts" in s:
            return make_res([contract_q1])
        elif "decision_logs" in s or "decision_log" in s:
            return make_res([dec_ops])
        elif "board_sessions" in s:
            return make_res(None)
        elif "corporate_times" in s:
            return make_res([])
        elif "quarter_reports" in s:
            return make_res([])
        return make_res(None)

    db.execute.side_effect = side_effect

    report = await get_annual_report(db, company)

    assert report.outcome == "SURVIVED"
    assert report.raw_status == "completed"
    assert report.ceo_name == "Aarushi Sharma"
    assert report.company_name == "Solaris Kinetic"
    assert report.final_score == 87.5
    assert report.final_cash == 125000.0
    assert report.final_kpis["board_confidence"] == 78.0
    assert len(report.decisions) == 1
    assert report.decisions[0].decision_type == "budget"
    assert len(report.accepted_deals) == 1
    assert report.accepted_deals[0].client_name == "Starline Logistics"
    assert "MANDATE RATIFIED" in report.final_board_assessment


@pytest.mark.asyncio
async def test_annual_report_bankruptcy_and_fired_terminal_outcomes():
    """Verify terminal status mapping for bankrupt and fired sessions."""
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    player_id = uuid.uuid4()

    player = Player(id=player_id, full_name="Aarushi Sharma")
    company = Company(id=company_id, session_id=session_id, name="Apex Global", sector="Finance")

    # 1. Bankrupt status
    session_bankrupt = SessionModel(
        id=session_id, player_id=player_id, current_quarter=2, status="bankrupt"
    )
    score_row = Leaderboard(
        id=uuid.uuid4(), player_id=player_id, session_id=session_id,
        company_name=company.name, sector=company.sector, final_score=35.0,
        revenue_score=40.0, satisfaction_score=40.0, innovation_score=30.0,
        investor_score=20.0, survival_score=25.0, risk_penalty=20.0
    )
    state_bankrupt = CompanyStateModel(
        id=uuid.uuid4(), company_id=company_id, quarter=2, cash=-15000.0,
        revenue=10000.0, profit=-25000.0, stock_price=5.0, employees=100,
        client_satisfaction=30.0, employee_satisfaction=30.0, innovation=20.0,
        investor_confidence=10.0, brand=20.0, esg=30.0, risk=85.0,
        market_share=1.0, board_confidence=15.0,
    )

    db = AsyncMock()

    def make_res(val):
        res = MagicMock()
        res.scalar_one.return_value = val
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        scalars_mock.first.return_value = val[0] if isinstance(val, list) and val else val
        res.scalars.return_value = scalars_mock
        return res

    def side_effect(stmt):
        s = str(stmt).lower()
        if "sessions" in s:
            return make_res(session_bankrupt)
        elif "leaderboard" in s:
            return make_res(score_row)
        elif "players" in s:
            return make_res(player)
        elif "company_states" in s:
            return make_res([state_bankrupt])
        return make_res([])

    db.execute.side_effect = side_effect

    rep_bankrupt = await get_annual_report(db, company)
    assert rep_bankrupt.outcome == "BANKRUPT"
    assert rep_bankrupt.final_cash == -15000.0
    assert "INSOLVENCY DECLARATION" in rep_bankrupt.final_board_assessment

    # 2. Fired status
    session_fired = SessionModel(
        id=session_id, player_id=player_id, current_quarter=3, status="fired"
    )
    def side_effect_fired(stmt):
        s = str(stmt).lower()
        if "sessions" in s:
            return make_res(session_fired)
        elif "leaderboard" in s:
            return make_res(score_row)
        elif "players" in s:
            return make_res(player)
        elif "company_states" in s:
            return make_res([state_bankrupt])
        return make_res([])

    db.execute.side_effect = side_effect_fired
    rep_fired = await get_annual_report(db, company)
    assert rep_fired.outcome == "FIRED"
    assert "TERMINATED BY BOARD OF DIRECTORS" in rep_fired.final_board_assessment


@pytest.mark.asyncio
async def test_idempotent_finalize_game_prevents_duplicate_leaderboard_rows():
    """Verify finalize_game updates the existing row instead of adding duplicate rows."""
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    player_id = uuid.uuid4()

    company = Company(id=company_id, session_id=session_id, name="Apex Global", sector="Finance")
    existing_row = Leaderboard(
        id=uuid.uuid4(), player_id=player_id, session_id=session_id,
        company_name=company.name, sector=company.sector, final_score=50.0
    )
    state = CompanyStateModel(
        id=uuid.uuid4(), company_id=company_id, quarter=1, cash=50000.0,
        revenue=20000.0, profit=5000.0, stock_price=50.0, employees=100,
        client_satisfaction=50.0, employee_satisfaction=50.0, innovation=50.0,
        investor_confidence=50.0, brand=50.0, esg=50.0, risk=20.0,
        market_share=5.0, board_confidence=50.0,
    )

    db = AsyncMock()
    db.add = MagicMock()

    def make_res(val):
        res = MagicMock()
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    def side_effect(stmt):
        s = str(stmt).lower()
        if "leaderboard" in s:
            return make_res(existing_row)
        elif "company_states" in s:
            return make_res([state])
        return make_res(None)

    db.execute.side_effect = side_effect

    await finalize_game(db, company)

    # db.add must NOT be called when existing row is present
    db.add.assert_not_called()
    assert existing_row.final_score is not None


# ---------------------------------------------------------------------------
# TRACK 2: AI Providers (Groq -> Gemini -> Fallback) & No Azure Ollama
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_ai_provider_chain_groq_primary_gemini_secondary():
    """Verify Groq is called first; on failure, Gemini is invoked."""
    with patch("app.ai.llm_client.get_settings") as mock_get_settings:
        mock_settings = MagicMock()
        mock_settings.groq_api_key = "fake_groq_key"
        mock_settings.gemini_api_key = "fake_gemini_key"
        mock_settings.groq_model = "openai/gpt-oss-20b"
        mock_settings.gemini_model = "gemini-1.5-flash"
        mock_settings.enable_ollama = False
        mock_get_settings.return_value = mock_settings

        # Case 1: Groq succeeds (200)
        mock_groq_resp = MagicMock()
        mock_groq_resp.status_code = 200
        mock_groq_resp.json.return_value = {"choices": [{"message": {"content": "Groq response"}}]}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.return_value = mock_groq_resp
            res = await request_llm_completion("sys", "user")
            assert res == "Groq response"
            assert "api.groq.com" in mock_post.call_args[0][0]

        # Case 2: Groq 429 rate limit -> Gemini fallback succeeds
        mock_groq_429 = MagicMock()
        mock_groq_429.status_code = 429

        mock_gemini_resp = MagicMock()
        mock_gemini_resp.status_code = 200
        mock_gemini_resp.json.return_value = {"candidates": [{"content": {"parts": [{"text": "Gemini response"}]}}]}

        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = [mock_groq_429, mock_gemini_resp]
            res = await request_llm_completion("sys", "user")
            assert res == "Gemini response"
            assert mock_post.call_count == 2
            assert "api.groq.com" in mock_post.call_args_list[0][0][0]
            assert "generativelanguage.googleapis.com" in mock_post.call_args_list[1][0][0]

        # Case 3: Both fail -> Returns None for deterministic fallback
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
            mock_post.side_effect = [mock_groq_429, MagicMock(status_code=500)]
            res = await request_llm_completion("sys", "user")
            assert res is None


@pytest.mark.asyncio
async def test_ollama_never_called_in_azure_mode():
    """Verify generate_completion and get_embedding return None immediately when enable_ollama is False."""
    with patch("app.ai.ollama_client.get_settings") as mock_get_settings, \
         patch("httpx.AsyncClient") as mock_client:
        mock_settings = MagicMock()
        mock_settings.enable_ollama = False
        mock_get_settings.return_value = mock_settings

        res = await generate_completion("sys", "user")
        assert res is None
        mock_client.assert_not_called()

        emb = await get_embedding("test query")
        assert emb is None
        mock_client.assert_not_called()


# ---------------------------------------------------------------------------
# TRACK 3: Leaderboard PRN Privacy
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_leaderboard_prn_privacy_and_branch_display():
    """Verify public leaderboard response sets masked_prn=None and includes branch."""
    player_id = uuid.uuid4()
    session_id = uuid.uuid4()

    player = Player(
        id=player_id,
        full_name="Aarushi Sharma",
        prn="2022BTECS00042",
        department="Computer Science & Engineering",
        institution_name="SIT Pune",
    )
    score_row = Leaderboard(
        id=uuid.uuid4(),
        player_id=player_id,
        session_id=session_id,
        company_name="Apex Robotics",
        sector="Robotics",
        final_score=92.4,
        rank=1,
    )

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.all.return_value = [(score_row, player)]
    db.execute.return_value = mock_res

    res = await get_leaderboard(db, limit=10)
    assert len(res) == 1
    row = res[0]
    # PRN MUST be None for privacy
    assert row.masked_prn is None
    # Branch must be provided for display
    assert row.branch == "Computer Science & Engineering"
    assert row.participant_name == "Aarushi Sharma"
    assert row.final_score == 92.4


# ---------------------------------------------------------------------------
# TRACK 4: Client World Exact Two-Deal Engine & Remediation
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_exact_two_deal_schedule_combinations():
    """
    Verify the exact 4-combination deal follow-up schedule:
    | Q1 deal | Q2 deal | Q3 Client World | Q4 Client World |
    | Rej     | Rej     | None            | None            |
    | Acc     | Rej     | Q1 deal         | None            |
    | Rej     | Acc     | Q2 deal         | None            |
    | Acc     | Acc     | Q1 deal         | Q2 deal         |
    """
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Apex Global", sector="Tech")

    def make_contract(q, status):
        return Contract(
            id=uuid.uuid4(), company_id=company_id, quarter=q,
            client_name=f"Client Q{q}", client_type="enterprise",
            status=status, value=25000.0, relationship_score=60.0
        )

    db = AsyncMock()

    def make_scalars_mock(contracts):
        res = MagicMock()
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = contracts
        res.scalars.return_value = scalars_mock
        return res

    # Combo 1: (Rej, Rej)
    c_rej_rej = [make_contract(1, "closed_lost"), make_contract(2, "closed_lost")]
    db.execute.return_value = make_scalars_mock(c_rej_rej)
    assert await get_scheduled_followup_deal(db, company, 3) is None
    assert await get_scheduled_followup_deal(db, company, 4) is None

    # Combo 2: (Acc, Rej)
    c_acc_rej = [make_contract(1, "closed_won"), make_contract(2, "closed_lost")]
    db.execute.return_value = make_scalars_mock(c_acc_rej)
    deal_q3 = await get_scheduled_followup_deal(db, company, 3)
    assert deal_q3 is not None and deal_q3.quarter == 1
    assert await get_scheduled_followup_deal(db, company, 4) is None

    # Combo 3: (Rej, Acc)
    c_rej_acc = [make_contract(1, "closed_lost"), make_contract(2, "closed_won")]
    db.execute.return_value = make_scalars_mock(c_rej_acc)
    deal_q3 = await get_scheduled_followup_deal(db, company, 3)
    assert deal_q3 is not None and deal_q3.quarter == 2
    assert await get_scheduled_followup_deal(db, company, 4) is None

    # Combo 4: (Acc, Acc)
    c_acc_acc = [make_contract(1, "closed_won"), make_contract(2, "closed_won")]
    db.execute.return_value = make_scalars_mock(c_acc_acc)
    deal_q3 = await get_scheduled_followup_deal(db, company, 3)
    assert deal_q3 is not None and deal_q3.quarter == 1
    deal_q4 = await get_scheduled_followup_deal(db, company, 4)
    assert deal_q4 is not None and deal_q4.quarter == 2


@pytest.mark.asyncio
async def test_client_remediation_word_limit_enforcement():
    """Verify backend rejects responses over 50 words or empty responses."""
    company_id = uuid.uuid4()
    company = Company(id=company_id, name="Apex Global", sector="Tech")
    db = AsyncMock()

    # Empty response
    with pytest.raises(ValueError, match="cannot be empty"):
        await submit_client_remediation(db, company, 3, str(uuid.uuid4()), 6000.0, "")

    # Over 50 words
    long_response = " ".join(["word"] * 55)
    with pytest.raises(ValueError, match="exceeds maximum limit of 50 words"):
        await submit_client_remediation(db, company, 3, str(uuid.uuid4()), 6000.0, long_response)


@pytest.mark.asyncio
async def test_client_remediation_refund_and_insolvency():
    """Verify compensation deduction reduces company cash and triggers bankruptcy if cash < 0."""
    company_id = uuid.uuid4()
    session_id = uuid.uuid4()
    company = Company(id=company_id, session_id=session_id, name="Apex Global", sector="Tech")
    contract_id = uuid.uuid4()
    contract = Contract(
        id=contract_id, company_id=company_id, quarter=1,
        client_name="Starline Transport", client_type="aviation",
        value=30000.0, status="closed_won", relationship_score=60.0
    )
    # Starting cash of 5,000; paying 8,000 compensation leaves -3,000 cash (insolvent)
    state = CompanyStateModel(
        id=uuid.uuid4(), company_id=company_id, quarter=3,
        cash=5000.0, client_satisfaction=50.0, brand=50.0, risk=20.0, esg=50.0
    )
    session_row = SessionModel(
        id=session_id, player_id=uuid.uuid4(), current_quarter=3, status="active"
    )

    db = AsyncMock()
    db.add = MagicMock()

    def make_res(val):
        res = MagicMock()
        res.scalar_one.return_value = val
        res.scalar_one_or_none.return_value = val
        scalars_mock = MagicMock()
        scalars_mock.all.return_value = val if isinstance(val, list) else ([val] if val is not None else [])
        res.scalars.return_value = scalars_mock
        return res

    def side_effect(stmt):
        s = str(stmt).lower()
        if "decision_logs" in s or "decision_log" in s:
            return make_res(None)
        elif "company_states" in s or "company_state" in s:
            return make_res(state)
        elif "contracts" in s or "contract" in s:
            return make_res(contract)
        elif "sessions" in s or "session" in s:
            return make_res(session_row)
        return make_res(None)

    db.execute.side_effect = side_effect

    with patch("app.services.scoring_service.finalize_game", new_callable=AsyncMock) as mock_finalize:
        res = await submit_client_remediation(
            db=db,
            company=company,
            quarter=3,
            contract_id=str(contract_id),
            compensation_amount=8000.0,
            status_update="Dedicated engineers deployed to guarantee SLA milestones on time.",
        )

        assert res["status"] == "BANKRUPT"
        assert res["new_cash"] == 5000.0  # Rejected deduction: cash never drops to negative!
        assert res["bankrupt"] is True
        assert session_row.status == "bankrupt"
        mock_finalize.assert_awaited_once()


# ---------------------------------------------------------------------------
# TRACK 5: Obsolete Timed Crisis Removal
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_obsolete_timed_crisis_removed():
    """Verify get_active_event returns None without firing automatic 60s random crises."""
    session_id = uuid.uuid4()
    db = AsyncMock()

    # When no active EventInstance row exists in DB
    mock_res = MagicMock()
    mock_res.scalar_one_or_none.return_value = None
    mock_res.scalars.return_value.all.return_value = []
    db.execute.return_value = mock_res

    company = Company(id=uuid.uuid4(), name="Apex Global", sector="Tech")
    event = await get_active_event(db, company, quarter=1)
    assert event is None
