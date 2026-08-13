from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session
from app.core.security import create_access_token
from app.models import Company, CompanyState as CompanyStateModel, Session as SessionModel
from app.schemas.registration import CompanyOut, RegisterRequest, RegisterResponse
from app.services.registration_service import register_or_resume

router = APIRouter()


@router.post("/players/register", response_model=RegisterResponse)
async def register_player(
    payload: RegisterRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    try:
        result = await register_or_resume(db, payload)
    except ValueError as e:
        if str(e) == "PRN_MISMATCH":
            raise HTTPException(
                status_code=409,
                detail="This PRN is already registered under a different name or email.",
            )
        raise

    token = create_access_token(result.player_id, result.session_id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24,
    )
    return result


@router.get("/me", response_model=RegisterResponse)
async def get_me(
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> RegisterResponse:
    company_result = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_result.scalar_one()

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == session_row.current_quarter,
        )
    )
    state = state_result.scalar_one()

    return RegisterResponse(
        player_id=session_row.player_id,
        session_id=session_row.id,
        company_id=company.id,
        resumed=True,
        company=CompanyOut(
            name=company.name, sector=company.sector, backstory=company.backstory,
            unique_strength=company.unique_strength, unique_weakness=company.unique_weakness,
            unique_passive_ability=company.unique_passive_ability,
            cash=float(state.cash), employees=state.employees,
        ),
    )