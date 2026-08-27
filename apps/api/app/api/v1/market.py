from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import Company, MarketSnapshot, Session as SessionModel
from app.schemas.market import CompetitorOut, MarketSnapshotOut, MarketViewOut
from app.services.market_service import build_news, get_competitors, get_or_create_snapshot

router = APIRouter()


@router.get("/companies/{company_id}/market", response_model=MarketViewOut)
async def get_market_view(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> MarketViewOut:
    quarter = session_row.current_quarter
    snapshot = await get_or_create_snapshot(db, session_row.id, quarter)

    prev_result = await db.execute(
        select(MarketSnapshot).where(
            MarketSnapshot.session_id == session_row.id, MarketSnapshot.quarter == quarter - 1
        )
    )
    previous = prev_result.scalar_one_or_none()

    competitors = await get_competitors(db, company)
    news = build_news(snapshot, previous)

    return MarketViewOut(
        snapshot=MarketSnapshotOut(
            quarter=snapshot.quarter, oil_price=float(snapshot.oil_price),
            interest_rate=float(snapshot.interest_rate), inflation=float(snapshot.inflation),
            commodity_index=float(snapshot.commodity_index), currency_index=float(snapshot.currency_index),
        ),
        competitors=[CompetitorOut(**c) for c in competitors],
        news=news,
    )