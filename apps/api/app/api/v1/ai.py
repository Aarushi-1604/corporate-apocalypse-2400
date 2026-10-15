from typing import Dict
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.advisor import get_advisor_response
from app.ai.dictionary import get_dictionary_response
from app.core.db import get_db
from app.core.deps import get_current_session
from app.models import AiConversation, Company, CompanyState as CompanyStateModel
from app.models import Session as SessionModel
from app.schemas.ai import AdvisorRequest, AdvisorResponse, DictionaryRequest, DictionaryResponse

router = APIRouter()

# Authoritative session screen question quota tracking
# Limits each screen to max 3 queries, resetting upon screen transition
MAX_SCREEN_QUERIES = 3
SESSION_SCREEN_QUERY_COUNTS: Dict[str, int] = {}


@router.post("/ai/advisor", response_model=AdvisorResponse)
async def advisor(
    payload: AdvisorRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> AdvisorResponse:
    screen_name = (payload.screen or "general").strip()
    session_key = f"{session_row.id}:{screen_name}"
    current_count = SESSION_SCREEN_QUERY_COUNTS.get(session_key, 0)

    if current_count >= MAX_SCREEN_QUERIES:
        limit_msg = (
            f"[ARIA TERMINAL LIMIT REACHED] You have reached the maximum quota of {MAX_SCREEN_QUERIES} queries "
            f"for this screen ('{screen_name}'). "
            "To preserve cognitive clarity and strategic autonomy, ARIA limits advisory queries per stage. "
            "This quota resets when you navigate to another department, world, or next quarter."
        )
        return AdvisorResponse(
            answer=limit_msg,
            source="quota_limit",
            was_blocked=True,
            queries_remaining=0,
        )

    company_result = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_result.scalar_one()

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == session_row.current_quarter,
        )
    )
    state = state_result.scalar_one()

    answer, source, was_blocked = await get_advisor_response(
        query=payload.query,
        company=company,
        state=state,
        context=payload.context,
        mode=payload.mode,
    )

    # Increment query count for this screen
    SESSION_SCREEN_QUERY_COUNTS[session_key] = current_count + 1
    remaining = max(0, MAX_SCREEN_QUERIES - (current_count + 1))

    db.add(
        AiConversation(
            session_id=session_row.id,
            mode=payload.mode or "advisor",
            prompt=payload.query,
            response=answer,
            was_blocked=was_blocked,
        )
    )
    await db.commit()

    return AdvisorResponse(
        answer=answer,
        source=source,
        was_blocked=was_blocked,
        queries_remaining=remaining,
    )


@router.post("/ai/dictionary", response_model=DictionaryResponse)
async def dictionary(
    payload: DictionaryRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> DictionaryResponse:
    answer, source, was_blocked = await get_dictionary_response(payload.query)

    db.add(
        AiConversation(
            session_id=session_row.id,
            mode="dictionary",
            prompt=payload.query,
            response=answer,
            was_blocked=was_blocked,
        )
    )
    await db.commit()

    return DictionaryResponse(answer=answer, source=source, was_blocked=was_blocked)