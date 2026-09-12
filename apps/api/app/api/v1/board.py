from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_owned_company, get_current_session
from app.models import Company, Session as SessionModel
from app.schemas.board import ActiveBoardExchangeOut, BoardRespondRequest, BoardRespondResponse
from app.services.board_service import get_active_board_exchange, respond_to_board_exchange
from sqlalchemy import select 
router = APIRouter()


@router.get("/companies/{company_id}/board/active", response_model=ActiveBoardExchangeOut | None)
async def get_active(
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
) -> ActiveBoardExchangeOut | None:
    return await get_active_board_exchange(db, company)


@router.post("/board/exchanges/{exchange_id}/respond", response_model=BoardRespondResponse)
async def respond(
    exchange_id: str,
    payload: BoardRespondRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> BoardRespondResponse:
    company_result = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_result.scalar_one()

    try:
        delta, complete, fired, new_conf = await respond_to_board_exchange(
            db, exchange_id, payload.chosen_option_index, company.id
        )
    except ValueError as e:
        if str(e) == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Exchange not found.")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="This exchange does not belong to you.")
        if str(e) == "ALREADY_ANSWERED":
            raise HTTPException(status_code=409, detail="This exchange was already answered.")
        if str(e) == "INVALID_OPTION":
            raise HTTPException(status_code=400, detail="Invalid response option.")
        raise

    return BoardRespondResponse(
        confidence_delta=delta, session_complete=complete, fired=fired, new_confidence=new_conf
    )