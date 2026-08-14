from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Session as SessionModel
from app.schemas.operations import BudgetDraftOut, BudgetSubmitRequest, LockRequest, LockResponse
from app.services.operations_service import get_budget_draft, lock_decisions, submit_budget

router = APIRouter()


@router.get("/companies/{company_id}/budget", response_model=BudgetDraftOut)
async def get_budget(
    quarter: int,
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
) -> BudgetDraftOut:
    return await get_budget_draft(db, company, quarter)


@router.post("/companies/{company_id}/budget")
async def post_budget(
    payload: BudgetSubmitRequest,
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
) -> dict:
    await submit_budget(db, company, payload.quarter, payload.allocations)
    return {"status": "saved"}


@router.post("/companies/{company_id}/decisions/lock", response_model=LockResponse)
async def post_lock(
    payload: LockRequest,
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> LockResponse:
    try:
        return await lock_decisions(db, session_row, company, payload.quarter)
    except ValueError as e:
        if str(e) == "OVERSPENT":
            raise HTTPException(status_code=400, detail="Budget exceeds available cash.")
        if str(e) == "WRONG_QUARTER":
            raise HTTPException(status_code=409, detail="Quarter mismatch -- refresh and try again.")
        raise