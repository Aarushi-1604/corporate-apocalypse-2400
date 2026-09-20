from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.advisor import get_advisor_response
from app.core.db import get_db
from app.core.deps import get_current_session
from app.models import AiConversation, Company, CompanyState as CompanyStateModel
from app.models import Session as SessionModel
from app.schemas.ai import AdvisorRequest, AdvisorResponse

router = APIRouter()


@router.post("/ai/advisor", response_model=AdvisorResponse)
async def advisor(
    payload: AdvisorRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> AdvisorResponse:
    company_result = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_result.scalar_one()

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == session_row.current_quarter,
        )
    )
    state = state_result.scalar_one()

    answer, source, was_blocked = await get_advisor_response(payload.query, company, state)

    db.add(
        AiConversation(
            session_id=session_row.id, mode="advisor",
            prompt=payload.query, response=answer, was_blocked=was_blocked,
        )
    )
    await db.commit()

    return AdvisorResponse(answer=answer, source=source, was_blocked=was_blocked)