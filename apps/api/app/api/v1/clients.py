from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Contract, Session as SessionModel
from app.schemas.clients import ContractOut, DecisionRequest, DecisionResponse, NegotiateRequest
from app.services.client_service import decide, get_current_contract, negotiate

router = APIRouter()


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