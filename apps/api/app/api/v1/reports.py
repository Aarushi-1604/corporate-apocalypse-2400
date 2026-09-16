from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, Session as SessionModel
from app.schemas.reports import CorporateTimesOut, QuarterReportOut
from app.services.report_service import get_or_create_corporate_times, get_quarter_report

router = APIRouter()


@router.get("/companies/{company_id}/reports/quarter/{quarter}", response_model=QuarterReportOut)
async def get_report(
    quarter: int,
    company: Company = Depends(get_owned_company),
    db: AsyncSession = Depends(get_db),
) -> QuarterReportOut:
    report = await get_quarter_report(db, company, quarter)
    if report is None:
        raise HTTPException(status_code=404, detail="No report exists for that quarter yet.")
    return report


@router.get("/corporate-times/{quarter}", response_model=CorporateTimesOut)
async def get_corporate_times(
    quarter: int,
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> CorporateTimesOut:
    return await get_or_create_corporate_times(db, session_row.id, quarter)