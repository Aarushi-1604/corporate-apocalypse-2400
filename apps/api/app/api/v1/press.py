from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Session as SessionModel
from app.schemas.press import PressRespondOut, PressRespondRequest, PressSessionOut
from app.services.press_service import get_or_create_press_session, submit_press_response

router = APIRouter()


@router.get(
    "/companies/{company_id}/press/session",
    response_model=PressSessionOut,
)
async def get_press_session(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> PressSessionOut:
    """
    Returns the active press conference session, crisis dossier, or completed report for the current quarter.
    """
    session_data = await get_or_create_press_session(db, company, session_row.current_quarter)
    return PressSessionOut(**session_data)


@router.post(
    "/companies/{company_id}/press/respond",
    response_model=PressRespondOut,
)
async def respond_to_press(
    payload: PressRespondRequest,
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> PressRespondOut:
    """
    Submits one CEO statement (max 1 sentence, <= 50 words).
    Generates follow-up question (if exchange < 3) or final consequences (if exchange 3).
    """
    try:
        result = await submit_press_response(
            db=db,
            company=company,
            quarter=session_row.current_quarter,
            statement=payload.statement,
        )
        return PressRespondOut(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
