from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import create_access_token, decode_access_token
from app.models import Company, CompanyState as CompanyStateModel, Session as SessionModel
from app.schemas.registration import CompanyOut, RegisterRequest, RegisterResponse
from app.services.registration_service import register_or_resume
from sqlalchemy import select

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
async def get_me(request: Request, db: AsyncSession = Depends(get_db)) -> RegisterResponse:
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in.")

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    session_result = await db.execute(
        select(SessionModel).where(SessionModel.id == payload["session_id"])
    )
    session_row = session_result.scalar_one_or_none()
    if session_row is None:
        raise HTTPException(status_code=404, detail="Session not found.")

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
        resumed=True,
        company=CompanyOut(
            name=company.name, sector=company.sector, backstory=company.backstory,
            unique_strength=company.unique_strength, unique_weakness=company.unique_weakness,
            unique_passive_ability=company.unique_passive_ability,
            cash=float(state.cash), employees=state.employees,
        ),
    )