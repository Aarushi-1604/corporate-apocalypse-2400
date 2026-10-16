from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Leaderboard, Player
from app.schemas.leaderboard import LeaderboardRowOut


def _mask_prn(prn: str | None) -> str | None:
    if not prn:
        return None
    clean = prn.strip()
    if len(clean) <= 4:
        return f"PRN-{clean}"
    return f"PRN-***{clean[-4:]}"


async def get_leaderboard(db: AsyncSession, limit: int = 10) -> list[LeaderboardRowOut]:
    """
    Returns top ranked eligible participants based on persisted authoritative final scores.
    Uses deterministic tie-breaking: final_score DESC, updated_at ASC (earlier completion wins).
    Joins with Player to safely display participant name, masked PRN, and branch/institution.
    """
    result = await db.execute(
        select(Leaderboard, Player)
        .outerjoin(Player, Leaderboard.player_id == Player.id)
        .where(Leaderboard.excluded.is_(False), Leaderboard.final_score.is_not(None))
        .order_by(Leaderboard.final_score.desc(), Leaderboard.updated_at.asc())
        .limit(limit)
    )
    rows = result.all()

    leaderboard_entries: list[LeaderboardRowOut] = []
    for i, (board_row, player_row) in enumerate(rows):
        part_name = player_row.full_name if player_row else "Executive CEO"
        branch_name = (
            (player_row.department or player_row.institution_name)
            if player_row
            else "Executive Board"
        )
        entry = LeaderboardRowOut(
            id=board_row.id,
            company_name=board_row.company_name,
            sector=board_row.sector,
            final_score=float(board_row.final_score),
            rank=i + 1,
            participant_name=part_name,
            masked_prn=None,
            branch=branch_name,
            status="Completed Run",
            revenue_score=float(board_row.revenue_score) if board_row.revenue_score is not None else None,
            satisfaction_score=float(board_row.satisfaction_score) if board_row.satisfaction_score is not None else None,
            innovation_score=float(board_row.innovation_score) if board_row.innovation_score is not None else None,
            investor_score=float(board_row.investor_score) if board_row.investor_score is not None else None,
        )
        leaderboard_entries.append(entry)

    return leaderboard_entries