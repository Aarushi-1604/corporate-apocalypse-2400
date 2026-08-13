from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session
from app.models import Company, CompanyState as CompanyStateModel, Session as SessionModel
from app.schemas.company import CompanyStateOut

router = APIRouter()


@router.get("/companies/{company_id}/state", response_model=CompanyStateOut)
async def get_company_state(
    company_id: str,
    quarter: int,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> CompanyStateOut:
    company_result = await db.execute(select(Company).where(Company.id == company_id))
    company = company_result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found.")

    if company.session_id != session_row.id:
        raise HTTPException(status_code=403, detail="This company does not belong to you.")

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