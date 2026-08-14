from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import BudgetAllocation, Company, CompanyState as CompanyStateModel
from app.models import DecisionLog, Session as SessionModel
from app.schemas.company import CompanyStateOut
from app.schemas.operations import BudgetAllocationIn, BudgetAllocationOut, BudgetDraftOut, LockResponse
from app.simulation.engine import tick
from app.simulation.models import CompanyState as EngineCompanyState, Decision


async def get_budget_draft(db: AsyncSession, company: Company, quarter: int) -> BudgetDraftOut:
    result = await db.execute(
        select(BudgetAllocation).where(
            BudgetAllocation.company_id == company.id,
            BudgetAllocation.quarter == quarter,
        )
    )
    rows = result.scalars().all()

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one()

    return BudgetDraftOut(
        allocations=[BudgetAllocationOut(category=r.category, amount=float(r.amount)) for r in rows],
        available_capital=float(state.cash),
    )


async def submit_budget(
    db: AsyncSession, company: Company, quarter: int, allocations: list[BudgetAllocationIn]
) -> None:
    await db.execute(
        delete(BudgetAllocation).where(
            BudgetAllocation.company_id == company.id,
            BudgetAllocation.quarter == quarter,
        )
    )
    for alloc in allocations:
        db.add(
            BudgetAllocation(
                company_id=company.id, quarter=quarter,
                category=alloc.category, amount=alloc.amount,
            )
        )
    await db.commit()


def _to_state_out(row: CompanyStateModel) -> CompanyStateOut:
    return CompanyStateOut(
        company_id=row.company_id, quarter=row.quarter,
        cash=float(row.cash), revenue=float(row.revenue), profit=float(row.profit),
        debt=float(row.debt), stock_price=float(row.stock_price), employees=row.employees,
        innovation=float(row.innovation), brand=float(row.brand),
        client_satisfaction=float(row.client_satisfaction),
        employee_satisfaction=float(row.employee_satisfaction),
        investor_confidence=float(row.investor_confidence), esg=float(row.esg),
        risk=float(row.risk), market_share=float(row.market_share),
        board_confidence=float(row.board_confidence),
    )


async def lock_decisions(
    db: AsyncSession, session_row: SessionModel, company: Company, quarter: int
) -> LockResponse:
    if quarter != session_row.current_quarter:
        raise ValueError("WRONG_QUARTER")

    # Idempotency check (see Phase 12 Concepts): next quarter's row
    # existing already means this lock already happened.
    existing_next = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter + 1,
        )
    )
    already = existing_next.scalar_one_or_none()
    if already is not None:
        return LockResponse(
            new_quarter=quarter + 1, deltas={},
            board_session_required=float(already.board_confidence) < 40,
            bankruptcy=float(already.cash) < 0,
            already_locked=True,
            new_state=_to_state_out(already),
        )

    current_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    current = current_result.scalar_one()

    budget_result = await db.execute(
        select(BudgetAllocation).where(
            BudgetAllocation.company_id == company.id,
            BudgetAllocation.quarter == quarter,
        )
    )
    decisions = [
        Decision(category=row.category, amount=float(row.amount))
        for row in budget_result.scalars().all()
    ]

    engine_state = EngineCompanyState(
        cash=float(current.cash), revenue=float(current.revenue), profit=float(current.profit),
        debt=float(current.debt), stock_price=float(current.stock_price), employees=current.employees,
        innovation=float(current.innovation), brand=float(current.brand),
        client_satisfaction=float(current.client_satisfaction),
        employee_satisfaction=float(current.employee_satisfaction),
        investor_confidence=float(current.investor_confidence), esg=float(current.esg),
        risk=float(current.risk), market_share=float(current.market_share),
        board_confidence=float(current.board_confidence),
    )

    # market=None, traits=None: macro market effects (Phase 16) and
    # passive-ability wiring aren't connected yet -- deliberate scope
    # cut, both flagged for a later phase. Engine already handles
    # both being absent (Phase 7).
    seed = (company.id.int % (2**31)) + quarter

    try:
        result = tick(engine_state, decisions, market=None, traits=None, seed=seed)
    except ValueError as e:
        raise ValueError("OVERSPENT") from e

    new_state_row = CompanyStateModel(
        company_id=company.id, quarter=quarter + 1,
        cash=result.new_state.cash, revenue=result.new_state.revenue, profit=result.new_state.profit,
        debt=result.new_state.debt, stock_price=result.new_state.stock_price,
        employees=result.new_state.employees, innovation=result.new_state.innovation,
        brand=result.new_state.brand, client_satisfaction=result.new_state.client_satisfaction,
        employee_satisfaction=result.new_state.employee_satisfaction,
        investor_confidence=result.new_state.investor_confidence, esg=result.new_state.esg,
        risk=result.new_state.risk, market_share=result.new_state.market_share,
        board_confidence=result.new_state.board_confidence,
    )
    db.add(new_state_row)

    db.add(
        DecisionLog(
            company_id=company.id, quarter=quarter, decision_type="budget",
            summary=f"Locked in Q{quarter} budget across {len(decisions)} categories.",
            stat_deltas=result.deltas,
        )
    )

    session_row.current_quarter = quarter + 1
    session_row.current_stage = "planning"

    await db.commit()
    await db.refresh(new_state_row)

    return LockResponse(
        new_quarter=quarter + 1, deltas=result.deltas,
        board_session_required=result.board_session_required,
        bankruptcy=result.bankruptcy, already_locked=False,
        new_state=_to_state_out(new_state_row),
    )