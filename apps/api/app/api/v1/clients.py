from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Contract, Session as SessionModel
from app.schemas.clients import ContractOut, DecisionRequest, DecisionResponse, NegotiateRequest
from app.services.client_service import decide, get_current_contract, negotiate
from app.services.client_negotiation_service import (
    advance_discovery,
    get_or_create_negotiation_session,
    handle_pursue_or_reject,
    submit_pitch_evaluation,
    submit_price_quote_and_resolve,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# Existing legacy endpoints (maintained for backward compatibility)
# -----------------------------------------------------------------------------
@router.get("/companies/{company_id}/contracts/current", response_model=ContractOut | None)
async def get_current(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> ContractOut | None:
    return await get_current_contract(db, company, session_row.current_quarter)


@router.post("/contracts/{contract_id}/negotiate")
async def post_negotiate(
    contract_id: str,
    payload: NegotiateRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found.")

    company_result = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_result.scalar_one()
    if contract.company_id != company.id:
        raise HTTPException(status_code=403, detail="This contract does not belong to you.")

    await negotiate(db, contract, payload.position)
    return {"status": "negotiating", "relationship_score": float(contract.relationship_score)}


@router.post("/contracts/{contract_id}/decision", response_model=DecisionResponse)
async def post_decision(
    contract_id: str,
    payload: DecisionRequest,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> DecisionResponse:
    result = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = result.scalar_one_or_none()
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found.")

    company_result = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_result.scalar_one()
    if contract.company_id != company.id:
        raise HTTPException(status_code=403, detail="This contract does not belong to you.")

    if contract.status in ("closed_won", "closed_lost"):
        raise HTTPException(status_code=409, detail="This contract is already closed.")

    deltas = await decide(
        db, company, session_row.current_quarter, contract, payload.action, payload.position
    )
    return DecisionResponse(status=contract.status, stat_deltas=deltas)


# -----------------------------------------------------------------------------
# New Multi-Stage Client World Negotiation Flow Endpoints
# -----------------------------------------------------------------------------

class AdvanceDiscoveryPayload(BaseModel):
    action: str = Field(..., description="'tell_me_more' or 'decline'")


class PursueRejectPayload(BaseModel):
    action: str = Field(..., description="'pursue' or 'reject'")


class SubmitPitchPayload(BaseModel):
    pitch: str = Field(..., min_length=3, max_length=1500)


class SubmitPriceQuotePayload(BaseModel):
    quoted_price: float = Field(..., gt=0)
    pitch_score: int = Field(default=60, ge=0, le=100)


@router.get("/companies/{company_id}/negotiation/session")
async def get_negotiation_session(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retrieves or initializes the multi-stage client negotiation session for the current quarter."""
    return await get_or_create_negotiation_session(db, company, session_row.current_quarter)


@router.post("/contracts/{contract_id}/discovery")
async def post_advance_discovery(
    contract_id: str,
    payload: AdvanceDiscoveryPayload,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Stage 1 -> Stage 2 (Discovery) or early decline."""
    company_res = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        return await advance_discovery(db, company, contract_id, payload.action)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/contracts/{contract_id}/pursue")
async def post_pursue_or_reject(
    contract_id: str,
    payload: PursueRejectPayload,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Stage 3: Pursue (advances to pitch) or reject opportunity."""
    company_res = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        return await handle_pursue_or_reject(db, company, contract_id, payload.action)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/contracts/{contract_id}/pitch")
async def post_pitch_evaluation(
    contract_id: str,
    payload: SubmitPitchPayload,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Stage 4: Free-text pitch submission with immediate Groq to Gemini fallback."""
    company_res = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        return await submit_pitch_evaluation(db, company, contract_id, payload.pitch)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/contracts/{contract_id}/quote")
async def post_price_quote(
    contract_id: str,
    payload: SubmitPriceQuotePayload,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Stage 6 -> Stage 7: Price quote submission & deterministic deal resolution."""
    company_res = await db.execute(select(Company).where(Company.session_id == session_row.id))
    company = company_res.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")

    try:
        return await submit_price_quote_and_resolve(
            db, company, contract_id, payload.quoted_price, payload.pitch_score
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))