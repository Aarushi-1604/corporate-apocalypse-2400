from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.leaderboard import LeaderboardRowOut
from app.services.leaderboard_service import get_leaderboard

router = APIRouter()


@router.get("/leaderboard", response_model=list[LeaderboardRowOut])
async def leaderboard(
    limit: int = 50,
    status_filter: str | None = None,
    batch: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[LeaderboardRowOut]:
    return await get_leaderboard(db, limit=limit, filter_status=status_filter, batch=batch)