from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Session as SessionModel
from app.schemas.events import ActiveEventOut, RespondRequest, RespondResponse
from app.services.event_service import get_active_event, respond_to_event

router = APIRouter()


@router.get("/companies/{company_id}/events/active", response_model=ActiveEventOut | None)
async def get_active(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> ActiveEventOut | None:
    return await get_active_event(db, company, session_row.current_quarter)


@router.post("/events/{event_instance_id}/respond", response_model=RespondResponse)
async def respond(
    event_instance_id: str,
    payload: RespondRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> RespondResponse:
    from app.models import Company as CompanyModel
    from sqlalchemy import select

    company_result = await db.execute(
        select(CompanyModel).where(CompanyModel.session_id == session_row.id)
    )
    company = company_result.scalar_one()

    try:
        text, deltas, already = await respond_to_event(
            db, event_instance_id, payload.chosen_option_index, company.id
        )
    except ValueError as e:
        if str(e) == "NOT_FOUND":
            raise HTTPException(status_code=404, detail="Event not found.")
        if str(e) == "FORBIDDEN":
            raise HTTPException(status_code=403, detail="This event does not belong to you.")
        if str(e) == "INVALID_OPTION":
            raise HTTPException(status_code=400, detail="Invalid response option.")
        raise

    return RespondResponse(follow_up_text=text, stat_deltas=deltas, already_resolved=already)