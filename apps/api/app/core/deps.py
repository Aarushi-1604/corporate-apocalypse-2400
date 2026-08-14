from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import decode_access_token
from app.models import Company, Session as SessionModel


async def get_current_session(
    request: Request, db: AsyncSession = Depends(get_db)
) -> SessionModel:
    """
    Reusable auth dependency. Reads the httpOnly cookie, decodes the
    JWT, looks up the real session row -- raises 401 at any failure
    point. Any endpoint needing "who is this player" declares this
    as a dependency instead of repeating the check inline.
    """
    token = request.cookies.get("session_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not logged in.")

    payload = decode_access_token(token)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired session.")

    result = await db.execute(
        select(SessionModel).where(SessionModel.id == payload["session_id"])
    )
    session_row = result.scalar_one_or_none()
    if session_row is None:
        raise HTTPException(status_code=404, detail="Session not found.")

    return session_row

async def get_owned_company(
    company_id: str,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> Company:
    """
    Reusable ownership check. `company_id` is matched automatically
    from the route's own path parameter -- any endpoint with
    {company_id} in its path can declare this as a dependency instead
    of repeating the lookup-and-check inline every time.
    """
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if company is None:
        raise HTTPException(status_code=404, detail="Company not found.")
    if company.session_id != session_row.id:
        raise HTTPException(status_code=403, detail="This company does not belong to you.")
    return company