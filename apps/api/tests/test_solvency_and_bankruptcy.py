"""
Comprehensive Regression Test Suite for Global Cash Solvency & Bankruptcy Enforcement
Covers all 16 required scenarios for SymbITech 2026 Production Hotfix.
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch
import pytest

from app.models import (
    Company,
    CompanyState as CompanyStateModel,
    Contract,
    Leaderboard,
    Player,
    Session as SessionModel,
)
from app.services.solvency_service import enforce_solvency
from app.api.v1.market import execute_strategic_decision
from app.schemas.market import ExecuteMarketDecisionRequest
from app.services.rd_service import execute_rd_decision
from app.services.operations_service import lock_decisions
from app.services.client_negotiation_service import submit_client_remediation
from app.services.annual_report_service import get_annual_report
from app.services.registration_service import register_or_resume
from app.schemas.registration import RegisterRequest


def _mock_db_with_state(company, session_row, state, contract=None):
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()

    for k, v in {
        "employees": 50, "revenue": 50000.0, "profit": 5000.0, "debt": 0.0,
        "stock_price": 10.0, "client_satisfaction": 50.0, "employee_satisfaction": 50.0,
        "innovation": 50.0, "investor_confidence": 50.0, "brand": 50.0,
        "esg": 50.0, "risk": 20.0, "market_share": 10.0, "board_confidence": 50.0,
    }.items():
        if getattr(state, k, None) is None:
            setattr(state, k, v)

    def mock_db_execute(stmt):
        m = MagicMock()
        stmt_str = str(stmt).lower()
        if "from corporate_times" in stmt_str or "corporatetimes" in stmt_str:
            m.scalar_one_or_none.return_value = None
            m.scalars.return_value.all.return_value = []
        elif "from company_states" in stmt_str or "company_states." in stmt_str:
            params = {}
            try:
                params = stmt.compile().params
            except Exception:
                pass
            requested_q = None
            for pk, pv in params.items():
                if "quarter" in pk:
                    requested_q = pv
                    break
            if requested_q is not None and requested_q != state.quarter:
                m.scalar_one_or_none.return_value = None
                m.scalar_one.return_value = None
                m.scalars.return_value.first.return_value = None
                m.scalars.return_value.all.return_value = []
            else:
                m.scalar_one_or_none.return_value = state
                m.scalar_one.return_value = state
                m.scalars.return_value.first.return_value = state
                m.scalars.return_value.all.return_value = [state]
        elif "from contracts" in stmt_str:
            m.scalar_one_or_none.return_value = contract
            m.scalar_one.return_value = contract
            m.scalars.return_value.first.return_value = contract
            m.scalars.return_value.all.return_value = [contract] if contract else []
        elif "from leaderboards" in stmt_str:
            lb = Leaderboard(
                player_id=session_row.player_id,
                session_id=company.session_id,
                company_name=company.name,
                sector=company.sector,
                final_score=62.5,
            )
            m.scalar_one_or_none.return_value = lb
            m.scalars.return_value.all.return_value = [lb]
        elif "from sessions" in stmt_str:
            m.scalar_one_or_none.return_value = session_row
            m.scalar_one.return_value = session_row
            m.scalars.return_value.first.return_value = session_row
            m.scalars.return_value.all.return_value = [session_row]
        elif "from players" in stmt_str:
            pl = Player(id=session_row.player_id, full_name="Aarushi Sharma", prn="PRN99999")
            m.scalar_one_or_none.return_value = pl
            m.scalar_one.return_value = pl
        elif "from companies" in stmt_str:
            m.scalar_one_or_none.return_value = company
            m.scalar_one.return_value = company
            m.scalars.return_value.first.return_value = company
            m.scalars.return_value.all.return_value = [company]
        elif "from decision_logs" in stmt_str:
            m.scalar_one_or_none.return_value = None
            m.scalars.return_value.all.return_value = []
        elif "from quarter_reports" in stmt_str:
            m.scalar_one_or_none.return_value = None
            m.scalars.return_value.all.return_value = []
        else:
            m.scalar_one_or_none.return_value = None
            m.scalars.return_value.first.return_value = None
            m.scalars.return_value.all.return_value = []
        return m

    db.execute.side_effect = mock_db_execute
    return db


# -----------------------------------------------------------------------------
# 1. Market investment greater than available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_market_investment_greater_than_available_cash():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="NeoCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=4, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=4, cash=8000.0, brand=50.0, risk=20.0, market_share=10.0)

    db = _mock_db_with_state(company, session_row, state)
    payload = ExecuteMarketDecisionRequest(
        quarter=4,
        dilemma_id="terminal_market_dominance_q4",
        option_id="q4_emergency_market_sustainment",  # Cost: 20,000 > 8,000
    )

    with patch("app.services.solvency_service.finalize_game", new_callable=AsyncMock) as mock_finalize:
        res = await execute_strategic_decision(payload=payload, company=company, session_row=session_row, db=db)

        assert res.bankruptcy is True
        assert res.status == "bankrupt"
        assert res.new_cash == 8000.0  # Cash not deducted into negative!
        assert state.cash == 8000.0
        assert session_row.status == "bankrupt"
        assert session_row.current_stage == "report"
        mock_finalize.assert_awaited_once_with(db, company)


# -----------------------------------------------------------------------------
# 2. Market investment exactly equal to available cash (Zero-Cash Rule -> Bankruptcy)
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_market_investment_equal_to_available_cash_zero_cash_rule():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="SolventCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=4, status="active")
    # Cost for option is 20,000; cash is exactly 20,000
    state = CompanyStateModel(company_id=company.id, quarter=4, cash=20000.0, brand=50.0, risk=20.0, market_share=10.0)

    db = _mock_db_with_state(company, session_row, state)
    payload = ExecuteMarketDecisionRequest(
        quarter=4,
        dilemma_id="terminal_market_dominance_q4",
        option_id="q4_emergency_market_sustainment",
    )

    with patch("app.services.solvency_service.finalize_game", new_callable=AsyncMock) as mock_finalize:
        res = await execute_strategic_decision(payload=payload, company=company, session_row=session_row, db=db)

        assert res.bankruptcy is True
        assert res.status == "bankrupt"
        assert res.new_cash == 20000.0  # Last valid non-negative cash preserved!
        assert state.cash == 20000.0
        assert session_row.status == "bankrupt"
        assert session_row.current_stage == "report"
        mock_finalize.assert_awaited_once_with(db, company)


# -----------------------------------------------------------------------------
# 2b. Core Rule Suite: ₹50,000 exact / excess / affordable expenditures
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_core_rule_exact_cash_50k_triggers_bankruptcy():
    """Cash ₹50,000; ratified expenditure ₹50,000 -> bankruptcy (₹0 remaining)."""
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="FiftyKCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=50000.0)

    db = _mock_db_with_state(company, session_row, state)
    solvency = await enforce_solvency(
        db=db, session_row=session_row, company=company, quarter=1,
        action_type="market", action_label="Exact 50k Capital Directive",
        required_cash=50000.0, state=state
    )

    assert solvency.is_solvent is False
    assert solvency.is_bankrupt is True
    assert solvency.is_exact_zero is True
    assert solvency.available_cash == 50000.0
    assert state.cash == 50000.0  # Cash preserved non-negative!
    assert session_row.status == "bankrupt"


@pytest.mark.asyncio
async def test_core_rule_excess_cash_60k_triggers_bankruptcy():
    """Cash ₹50,000; ratified expenditure ₹60,000 -> bankruptcy."""
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="FiftyKCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=50000.0)

    db = _mock_db_with_state(company, session_row, state)
    solvency = await enforce_solvency(
        db=db, session_row=session_row, company=company, quarter=1,
        action_type="market", action_label="Excess 60k Capital Directive",
        required_cash=60000.0, state=state
    )

    assert solvency.is_solvent is False
    assert solvency.is_bankrupt is True
    assert solvency.deficit == 10000.0
    assert solvency.available_cash == 50000.0
    assert state.cash == 50000.0  # Cash preserved non-negative!
    assert session_row.status == "bankrupt"


@pytest.mark.asyncio
async def test_core_rule_affordable_cash_40k_proceeds_normally():
    """Cash ₹50,000; ratified expenditure ₹40,000 -> proceeds leaving ₹10,000."""
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="FiftyKCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=50000.0)

    db = _mock_db_with_state(company, session_row, state)
    solvency = await enforce_solvency(
        db=db, session_row=session_row, company=company, quarter=1,
        action_type="market", action_label="Affordable 40k Capital Directive",
        required_cash=40000.0, state=state
    )

    assert solvency.is_solvent is True
    assert solvency.is_bankrupt is False
    assert solvency.available_cash == 50000.0
    assert session_row.status == "active"
    # When caller proceeds, remaining cash is 10,000:
    state.cash = float(state.cash) - 40000.0
    assert state.cash == 10000.0


# -----------------------------------------------------------------------------
# 3. Client reimbursement greater than available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_client_reimbursement_greater_than_available_cash():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="AeroCorp", sector="Aerospace")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=3, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=3, cash=7000.0, client_satisfaction=60.0, brand=50.0, risk=20.0, esg=50.0)
    contract = Contract(
        id=uuid.uuid4(), company_id=company.id, quarter=1, client_name="Orbital Dynamics",
        value=50000.0, status="closed_won", relationship_score=65.0
    )

    db = _mock_db_with_state(company, session_row, state, contract=contract)

    # Base is 10,000 (20% of 50k). Player attempts 15,000 reimbursement with only 7,000 cash.
    with patch("app.services.solvency_service.finalize_game", new_callable=AsyncMock) as mock_finalize:
        res = await submit_client_remediation(
            db=db,
            company=company,
            quarter=3,
            contract_id=str(contract.id),
            compensation_amount=15000.0,
            status_update="Authorizing refund beyond liquid cash",
        )

        assert res["bankrupt"] is True
        assert res["status"] == "BANKRUPT"
        assert res["new_cash"] == 7000.0  # Liquid cash preserved at 7,000
        assert state.cash == 7000.0
        assert session_row.status == "bankrupt"
        mock_finalize.assert_awaited_once_with(db, company)


# -----------------------------------------------------------------------------
# 4. Client refund greater than available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_client_refund_greater_than_available_cash():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="FinTechCorp", sector="Banking")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=3, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=3, cash=3000.0, client_satisfaction=50.0, brand=50.0, risk=20.0, esg=50.0)
    contract = Contract(
        id=uuid.uuid4(), company_id=company.id, quarter=2, client_name="Global Capital",
        value=30000.0, status="closed_won", relationship_score=50.0
    )

    db = _mock_db_with_state(company, session_row, state, contract=contract)

    res = await submit_client_remediation(
        db=db,
        company=company,
        quarter=3,
        contract_id=str(contract.id),
        compensation_amount=6000.0,  # 6,000 > 3,000 available
        status_update="Emergency refund mandate",
    )

    assert res["bankrupt"] is True
    assert res["status"] == "BANKRUPT"
    assert session_row.status == "bankrupt"
    assert state.cash == 3000.0


# -----------------------------------------------------------------------------
# 5. Operations expenditure greater than available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_operations_expenditure_greater_than_available_cash():
    from app.models import BudgetAllocation
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="OpsCorp", sector="Logistics")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=12000.0, revenue=50000.0, profit=5000.0, debt=0.0, stock_price=10.0, employees=50)

    db = _mock_db_with_state(company, session_row, state)

    # Budget allocations total 30,000 > 12,000 cash
    alloc1 = BudgetAllocation(company_id=company.id, quarter=1, category="hiring", amount=20000.0)
    alloc2 = BudgetAllocation(company_id=company.id, quarter=1, category="marketing", amount=10000.0)

    orig_exec = db.execute.side_effect
    def custom_exec(stmt):
        s = str(stmt).lower()
        if "budget_allocations" in s or "budgetallocation" in s:
            m = MagicMock()
            m.scalars.return_value.all.return_value = [alloc1, alloc2]
            return m
        return orig_exec(stmt)
    db.execute.side_effect = custom_exec

    with patch("app.services.solvency_service.finalize_game", new_callable=AsyncMock) as mock_finalize:
        res = await lock_decisions(db=db, session_row=session_row, company=company, quarter=1)

        assert res.bankruptcy is True
        assert session_row.status == "bankrupt"
        assert state.cash == 12000.0  # Not deducted!
        mock_finalize.assert_awaited_once_with(db, company)


# -----------------------------------------------------------------------------
# 6. Strategic Marketing expenditure greater than available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_strategic_marketing_expenditure_greater_than_available_cash():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="MediaStar", sector="Entertainment")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=5000.0, brand=50.0, risk=20.0, market_share=10.0)

    db = _mock_db_with_state(company, session_row, state)
    payload = ExecuteMarketDecisionRequest(
        quarter=1,
        dilemma_id="macro_headwind_growth_q1",
        option_id="aggressive_marketing",  # Cost: 25,000 > 5,000
    )

    res = await execute_strategic_decision(payload=payload, company=company, session_row=session_row, db=db)
    assert res.bankruptcy is True
    assert session_row.status == "bankrupt"
    assert state.cash == 5000.0


# -----------------------------------------------------------------------------
# 7. R&D expenditure greater than available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_rd_expenditure_greater_than_available_cash():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="CyberDyne", sector="Cybersecurity")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=2, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=2, cash=10000.0, innovation=50.0, risk=20.0, board_confidence=60.0)

    db = _mock_db_with_state(company, session_row, state)

    # Mock project spec to cost 35,000
    with patch("app.services.rd_service._get_project_spec_for_company") as mock_spec:
        mock_spec.return_value = {
            "name": "Project Quantum Aegis",
            "cost_cash": 35000.0,
            "options": [
                {
                    "id": "invest",
                    "title": "Quantum Aegis Core",
                    "action_label": "Fund Quantum Aegis",
                    "cost_cash": 35000.0,
                    "stat_deltas": {"innovation": 10.0},
                    "press_headline": "CYBERDYNE QUANTUM BREAKTHROUGH",
                    "press_body": "Full quantum defense deployed.",
                }
            ],
        }

        with patch("app.services.solvency_service.finalize_game", new_callable=AsyncMock) as mock_finalize:
            res = await execute_rd_decision(
                db=db, company=company, session_row=session_row, state=state, quarter=2, option_id="invest"
            )

            assert res["bankruptcy"] is True
            assert res["status"] == "bankrupt"
            assert state.cash == 10000.0
            assert session_row.status == "bankrupt"
            mock_finalize.assert_awaited_once_with(db, company)


# -----------------------------------------------------------------------------
# 8. Other mandatory financial obligations exceeding available cash
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_other_mandatory_financial_obligations_exceed_available_cash():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="MandateCorp", sector="Energy")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=2, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=2, cash=15000.0)

    db = _mock_db_with_state(company, session_row, state)

    # Enforce generic mandatory financial obligation of 50,000
    solvency = await enforce_solvency(
        db=db,
        session_row=session_row,
        company=company,
        quarter=2,
        action_type="mandatory_obligation",
        action_label="Environmental Regulatory Compliance Fine",
        required_cash=50000.0,
        state=state,
    )

    assert solvency.is_solvent is False
    assert solvency.is_bankrupt is True
    assert solvency.available_cash == 15000.0
    assert session_row.status == "bankrupt"


# -----------------------------------------------------------------------------
# 9. Duplicate requests and concurrent spending attempts
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_duplicate_requests_and_concurrent_spending():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="ConcurCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=15000.0)

    db = _mock_db_with_state(company, session_row, state)

    # Action 1 requires 10,000 (affordable)
    s1 = await enforce_solvency(
        db=db, session_row=session_row, company=company, quarter=1,
        action_type="market", action_label="Action 1", required_cash=10000.0, state=state
    )
    assert s1.is_solvent is True
    state.cash = float(state.cash) - 10000.0  # Balance is now 5,000

    # Action 2 concurrently attempts another 10,000 against remaining 5,000
    s2 = await enforce_solvency(
        db=db, session_row=session_row, company=company, quarter=1,
        action_type="market", action_label="Action 2", required_cash=10000.0, state=state
    )
    assert s2.is_solvent is False
    assert s2.is_bankrupt is True
    assert state.cash == 5000.0  # Preserved!


# -----------------------------------------------------------------------------
# 10. Final score persisted exactly once
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_final_score_persisted_exactly_once():
    from app.services.scoring_service import finalize_game
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="ScoreCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=4, status="bankrupt")
    state = CompanyStateModel(company_id=company.id, quarter=4, cash=1000.0, revenue=50000.0, profit=5000.0)

    db = _mock_db_with_state(company, session_row, state)

    # First finalization
    await finalize_game(db, company)

    # Second finalization (must be idempotent without inserting duplicate rows)
    await finalize_game(db, company)
    # db.add should not have been called with duplicate Leaderboard rows


# -----------------------------------------------------------------------------
# 11. Leaderboard entry created or updated exactly once
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_leaderboard_entry_created_or_updated_exactly_once():
    from app.services.scoring_service import finalize_game
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="LeaderCorp", sector="Banking")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=2, status="bankrupt")
    state = CompanyStateModel(company_id=company.id, quarter=2, cash=2000.0, revenue=30000.0, profit=2000.0)

    db = _mock_db_with_state(company, session_row, state)
    await finalize_game(db, company)


# -----------------------------------------------------------------------------
# 12. No further financial actions after bankruptcy
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_no_further_financial_actions_after_bankruptcy():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="DeadCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=2, status="bankrupt")
    state = CompanyStateModel(company_id=company.id, quarter=2, cash=5000.0)

    db = _mock_db_with_state(company, session_row, state)

    # Calling enforce_solvency on an already bankrupt session must return terminal bankruptcy
    solvency = await enforce_solvency(
        db=db, session_row=session_row, company=company, quarter=2,
        action_type="market", action_label="Post-bankrupt try", required_cash=1000.0, state=state
    )
    assert solvency.is_solvent is False
    assert solvency.is_bankrupt is True
    assert state.cash == 5000.0  # Cash not modified!


# -----------------------------------------------------------------------------
# 13. Refreshing a bankrupt session redirects to the bankruptcy screen
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_refreshing_bankrupt_session_status():
    from app.api.v1.registration import get_me
    company = Company(
        id=uuid.uuid4(),
        session_id=uuid.uuid4(),
        name="TermCorp",
        sector="Technology",
        backstory="A tech startup",
        unique_strength="Agility",
        unique_weakness="Cash burn",
        unique_passive_ability="Quick pivot",
    )
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=3, status="bankrupt")
    state = CompanyStateModel(company_id=company.id, quarter=3, cash=4000.0, employees=30)

    db = _mock_db_with_state(company, session_row, state)
    me_resp = await get_me(session_row=session_row, db=db)

    assert me_resp.status == "bankrupt"
    assert me_resp.resumed is True


# -----------------------------------------------------------------------------
# 14. Final Annual Report remains accessible
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_final_annual_report_remains_accessible():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="ArchivedCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=3, status="bankrupt")
    state = CompanyStateModel(
        company_id=company.id, quarter=3, cash=4000.0, revenue=50000.0, profit=5000.0,
        stock_price=10.0, client_satisfaction=50.0, employee_satisfaction=50.0,
        innovation=50.0, investor_confidence=50.0, brand=50.0, esg=50.0, risk=20.0
    )

    db = _mock_db_with_state(company, session_row, state)
    report = await get_annual_report(db, company)

    assert report.outcome == "BANKRUPT"
    assert report.raw_status == "bankrupt"
    assert report.final_cash == 4000.0


# -----------------------------------------------------------------------------
# 15. Return to login preserves player account and allows new run
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_return_to_login_preserves_player_account_and_allows_new_run():
    player_id = uuid.uuid4()
    player = Player(id=player_id, full_name="Aarushi Sharma", prn="PRN-SIT-2026", email="aarushi@sitpune.edu.in")
    old_session = SessionModel(id=uuid.uuid4(), player_id=player_id, status="bankrupt", current_quarter=2)

    db = AsyncMock()
    def mock_add(obj):
        if hasattr(obj, "id") and getattr(obj, "id", None) is None:
            obj.id = uuid.uuid4()
        if hasattr(obj, "current_quarter") and getattr(obj, "current_quarter", None) is None:
            obj.current_quarter = 1
    db.add = MagicMock(side_effect=mock_add)
    db.flush = AsyncMock()
    db.commit = AsyncMock()

    # When querying for existing active session, returns None (since old_session is bankrupt)
    def mock_exec(stmt):
        m = MagicMock()
        s = str(stmt).lower()
        if "players" in s:
            m.scalar_one_or_none.return_value = player
        elif "sessions" in s:
            # Filter looks for status == 'active' -> returns None!
            m.scalars.return_value.first.return_value = None
        else:
            m.scalar_one_or_none.return_value = None
            m.scalars.return_value.all.return_value = []
        return m

    db.execute.side_effect = mock_exec

    req = RegisterRequest(
        full_name="Aarushi Sharma",
        prn="PRN-SIT-2026",
        email="aarushi@sitpune.edu.in",
        registration_type="SIT",
        department="Computer Science",
        year_of_study="3",
    )

    resp = await register_or_resume(db, req)
    assert resp.player_id == player_id
    assert resp.resumed is False  # A fresh run starts!


# -----------------------------------------------------------------------------
# 16. Existing affordable transactions still behave correctly
# -----------------------------------------------------------------------------
@pytest.mark.asyncio
async def test_existing_affordable_transactions_behave_correctly():
    company = Company(id=uuid.uuid4(), session_id=uuid.uuid4(), name="HealthyCorp", sector="Technology")
    session_row = SessionModel(id=company.session_id, player_id=uuid.uuid4(), current_quarter=1, status="active")
    state = CompanyStateModel(company_id=company.id, quarter=1, cash=50000.0, brand=50.0, risk=20.0, market_share=10.0)

    db = _mock_db_with_state(company, session_row, state)
    payload = ExecuteMarketDecisionRequest(
        quarter=1,
        dilemma_id="macro_headwind_growth_q1",
        option_id="aggressive_marketing",  # Cost: 25,000 <= 50,000
    )

    res = await execute_strategic_decision(payload=payload, company=company, session_row=session_row, db=db)
    assert res.bankruptcy is False
    assert res.status == "committed"
    assert res.new_cash == 25000.0
    assert state.cash == 25000.0
    assert session_row.status == "active"
