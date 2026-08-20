from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Session as SessionModel
from app.schemas.employees import EmployeeFeedOut
from app.services.employee_service import get_employee_feed

router = APIRouter()


@router.get("/companies/{company_id}/employees/feed", response_model=EmployeeFeedOut)
async def get_feed(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> EmployeeFeedOut:
    return await get_employee_feed(db, company, session_row.current_quarter)