from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.schemas.leaderboard import LeaderboardRowOut
from app.services.leaderboard_service import get_leaderboard

router = APIRouter()


@router.get("/leaderboard", response_model=list[LeaderboardRowOut])
async def leaderboard(limit: int = 25, db: AsyncSession = Depends(get_db)) -> list[LeaderboardRowOut]:
    return await get_leaderboard(db, limit)