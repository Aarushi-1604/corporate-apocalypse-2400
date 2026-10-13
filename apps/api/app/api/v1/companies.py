from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, CompanyState as CompanyStateModel, DecisionLog, Session as SessionModel
from app.schemas.company import (
    CompanyStateOut,
    DepartmentLocksOut,
    DepartmentStatusOut,
)

router = APIRouter()


@router.get("/companies/{company_id}/state", response_model=CompanyStateOut)
async def get_company_state(
    quarter: int,
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
) -> CompanyStateOut:
    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one_or_none()
    if state is None:
        raise HTTPException(status_code=404, detail=f"No state recorded for quarter {quarter}.")

    return CompanyStateOut(
        company_id=company.id, quarter=state.quarter,
        cash=float(state.cash), revenue=float(state.revenue), profit=float(state.profit),
        debt=float(state.debt), stock_price=float(state.stock_price), employees=state.employees,
        innovation=float(state.innovation), brand=float(state.brand),
        client_satisfaction=float(state.client_satisfaction),
        employee_satisfaction=float(state.employee_satisfaction),
        investor_confidence=float(state.investor_confidence), esg=float(state.esg),
        risk=float(state.risk), market_share=float(state.market_share),
        board_confidence=float(state.board_confidence),
    )


@router.get(
    "/companies/{company_id}/departments/locks",
    response_model=DepartmentLocksOut,
)
async def get_department_locks(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> DepartmentLocksOut:
    """
    Returns the lock status of each quarterly department action for the current active quarter.
    Derived strictly from persisted game state (DecisionLog and next-quarter state rows).
    """
    quarter = session_row.current_quarter

    # 1. Check Operations lock:
    # A budget lock has occurred if a budget DecisionLog exists for this quarter
    # OR if next quarter's CompanyState row already exists.
    budget_log_result = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "budget",
        )
    )
    budget_log = budget_log_result.scalar_one_or_none()

    next_state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter + 1,
        )
    )
    next_state = next_state_result.scalar_one_or_none()
    ops_locked = budget_log is not None or next_state is not None

    # 2. Check Market lock:
    # A strategic marketing decision has been committed if a strategic_marketing DecisionLog exists.
    market_log_result = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "strategic_marketing",
        )
    )
    market_log = market_log_result.scalar_one_or_none()
    market_locked = market_log is not None

    market_headline = None
    market_press = None
    market_opt_title = None
    market_deltas = None
    if market_log:
        market_deltas = market_log.stat_deltas if isinstance(market_log.stat_deltas, dict) else None
        # Extract title and headline if summary formatted as "{title}: {headline}"
        if market_log.summary and ":" in market_log.summary:
            parts = market_log.summary.split(":", 1)
            market_opt_title = parts[0].strip()
            market_headline = parts[1].strip()
        else:
            market_headline = market_log.summary

        # Find matching press body from MARKETING_STRATEGIC_DILEMMAS
        from app.services.market_dilemma_service import MARKETING_STRATEGIC_DILEMMAS
        for d in MARKETING_STRATEGIC_DILEMMAS:
            for opt in d["options"]:
                if opt["title"] == market_opt_title or (market_log.summary and opt["title"] in market_log.summary):
                    market_press = opt["press_body"].format(company=company.name)
                    if not market_headline:
                        market_headline = opt["press_headline"].format(company=company.name)
                    break
            if market_press:
                break

    # 3. Check R&D lock:
    rd_log_result = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["rd", "research_development"]),
        )
    )
    rd_log = rd_log_result.scalar_one_or_none()
    rd_locked = rd_log is not None

    # 4. Check Client lock:
    client_log_result = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "client_negotiation",
        )
    )
    client_log = client_log_result.scalar_one_or_none()
    client_locked = client_log is not None

    # 5. Check Press lock:
    press_log_result = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "press",
        )
    )
    press_log = press_log_result.scalar_one_or_none()
    press_deltas = None
    if press_log and isinstance(press_log.stat_deltas, dict):
        press_deltas = {k: float(v) for k, v in press_log.stat_deltas.items() if isinstance(v, (int, float))}

    return DepartmentLocksOut(
        quarter=quarter,
        operations=DepartmentStatusOut(
            locked=ops_locked,
            summary=budget_log.summary if budget_log else ("Operations committed" if ops_locked else None),
            detail=str(budget_log.stat_deltas) if budget_log else None,
            stat_deltas=budget_log.stat_deltas if budget_log and isinstance(budget_log.stat_deltas, dict) else None,
        ),
        market=DepartmentStatusOut(
            locked=market_locked,
            summary=market_log.summary if market_log else None,
            detail=str(market_log.stat_deltas) if market_log else None,
            headline=market_headline,
            press=market_press,
            option_title=market_opt_title,
            stat_deltas=market_deltas,
        ),
        rd=DepartmentStatusOut(
            locked=rd_locked,
            summary=rd_log.summary if rd_log else None,
            detail=str(rd_log.stat_deltas) if rd_log else None,
            stat_deltas=rd_log.stat_deltas if rd_log and isinstance(rd_log.stat_deltas, dict) else None,
        ),
        client=DepartmentStatusOut(
            locked=client_locked,
            summary=client_log.summary if client_log else None,
            detail=str(client_log.stat_deltas) if client_log else None,
            stat_deltas=client_log.stat_deltas if client_log and isinstance(client_log.stat_deltas, dict) else None,
        ),
        press=DepartmentStatusOut(
            locked=press_locked,
            summary=press_log.summary if press_log else None,
            detail=str(press_log.stat_deltas) if press_log else None,
            stat_deltas=press_deltas,
        ),
    )