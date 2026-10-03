from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Leaderboard
from app.schemas.leaderboard import LeaderboardRowOut


async def get_leaderboard(db: AsyncSession, limit: int = 25) -> list[LeaderboardRowOut]:
    result = await db.execute(
        select(Leaderboard)
        .where(Leaderboard.excluded.is_(False), Leaderboard.final_score.is_not(None))
        .order_by(Leaderboard.final_score.desc())
        .limit(limit)
    )
    rows = result.scalars().all()

    return [
        LeaderboardRowOut(
            id=row.id, company_name=row.company_name, sector=row.sector,
            final_score=float(row.final_score), rank=i + 1,
        )
        for i, row in enumerate(rows)
    ]