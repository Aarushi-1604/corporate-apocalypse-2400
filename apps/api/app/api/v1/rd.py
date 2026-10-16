"""
R&D API Endpoints -- Project Genesis
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_session, get_owned_company
from app.core.db import get_db
from app.models import Company, CompanyState as CompanyStateModel, Session as SessionModel
from app.services.rd_service import get_helix_proposal, execute_rd_decision

router = APIRouter(prefix="/rd", tags=["Research & Development"])


class ExecuteRdDecisionPayload(BaseModel):
    quarter: int
    option_id: str = Field(..., description="'invest' or 'decline'")


class ExecuteRdDecisionResponse(BaseModel):
    status: str
    option_id: str
    option_title: str
    action_label: str
    summary: str
    cost_cash: float
    stat_deltas: Dict[str, float]
    press_headline: str
    press_body: str
    new_cash: float
    new_innovation: float
    new_risk: float
    new_board_confidence: float
    bankruptcy: bool = False
    action_attempted: Optional[str] = None
    required_amount: Optional[float] = None
    available_cash: Optional[float] = None
    final_score: Optional[float] = None


@router.get("/proposal")
async def get_proposal(
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Returns the Project Helix proposal data and affordability check for the player's company."""
    company_res = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found for current session")

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == session_row.current_quarter,
        )
    )
    state = state_result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail="Company state not found for current quarter")

    return await get_helix_proposal(company, state)


@router.post("/decision", response_model=ExecuteRdDecisionResponse)
async def post_rd_decision(
    payload: ExecuteRdDecisionPayload,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> ExecuteRdDecisionResponse:
    """Executes the Project Helix decision for the current quarter."""
    company_res = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found for current session")
    if payload.quarter != session_row.current_quarter:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Quarter mismatch: current active quarter is Q{session_row.current_quarter}",
        )

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == session_row.current_quarter,
        )
    )
    state = state_result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail="Company state not found for current quarter")

    try:
        result = await execute_rd_decision(
            db=db,
            company=company,
            session_row=session_row,
            state=state,
            quarter=payload.quarter,
            option_id=payload.option_id,
        )
        return ExecuteRdDecisionResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
