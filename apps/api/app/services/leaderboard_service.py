from datetime import datetime, timezone, timedelta, date
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Leaderboard, Player, Session as SessionModel
from app.schemas.leaderboard import LeaderboardRowOut

INDIA_TZ = timezone(timedelta(hours=5, minutes=30))
PUNE_DAY1_CUTOFF = datetime(2026, 10, 16, 18, 30, tzinfo=timezone.utc)
DAY2_START_DATE_IST = date(2026, 10, 17)


def _mask_prn(prn: str | None) -> str | None:
    if not prn:
        return None
    clean = prn.strip()
    if len(clean) <= 4:
        return f"PRN-{clean}"
    return f"PRN-***{clean[-4:]}"


async def get_leaderboard(
    db: AsyncSession,
    limit: int = 50,
    filter_status: str | None = None,
    batch: str | None = None,
) -> list[LeaderboardRowOut]:
    """
    Returns top ranked eligible participants based on persisted authoritative final scores.
    Option A: Adjusted score prominently, raw score underneath.
    Every terminal result shows short ending quarter and outcome:
    - BANKRUPT · Q{quarter}
    - FIRED BY BOARD · Q{quarter}
    - SURVIVED · Q4
    """
    query = (
        select(Leaderboard, Player, SessionModel)
        .outerjoin(Player, Leaderboard.player_id == Player.id)
        .outerjoin(SessionModel, Leaderboard.session_id == SessionModel.id)
        .where(
            Leaderboard.excluded.is_(False),
            Leaderboard.final_score.is_not(None),
        )
    )

    if filter_status:
        f = filter_status.lower().strip()
        if f in ("survived", "completed"):
            query = query.where(SessionModel.status == "completed")
        elif f == "bankrupt":
            query = query.where(SessionModel.status == "bankrupt")
        elif f == "fired":
            query = query.where(SessionModel.status == "fired")

    # If batch filtering, fetch a larger limit to ensure enough candidates before in-memory batch filtering
    fetch_limit = limit * 3 if batch and batch.lower().strip() not in ("all", "overall") else limit
    query = query.order_by(Leaderboard.final_score.desc(), Leaderboard.updated_at.asc()).limit(fetch_limit)

    result = await db.execute(query)
    rows = result.all()

    leaderboard_entries: list[LeaderboardRowOut] = []
    for i, row_item in enumerate(rows):
        if len(row_item) >= 3:
            board_row, player_row, session_row = row_item[0], row_item[1], row_item[2]
        else:
            board_row, player_row = row_item[0], row_item[1]
            session_row = None
        part_name = player_row.full_name if player_row else "Executive CEO"
        branch_name = (
            (player_row.department or player_row.institution_name)
            if player_row
            else "Executive Board"
        )

        # Determine Day 1 vs Day 2 batch:
        # Anyone registered on or after 17th October (IST) is Day 2
        reg_time = (
            player_row.created_at
            if player_row and player_row.created_at
            else (session_row.started_at if session_row and session_row.started_at else board_row.updated_at)
        )
        if reg_time and reg_time.tzinfo is None:
            reg_time = reg_time.replace(tzinfo=timezone.utc)

        if reg_time:
            ist_time = reg_time.astimezone(INDIA_TZ)
            day_batch = 2 if ist_time.date() >= DAY2_START_DATE_IST else 1
        else:
            day_batch = 2

        raw_score = float(board_row.final_score)
        # For Day 2, raw and adjusted scores are identical
        # For Day 1, calibrated formula maintains parity
        adjusted_score = raw_score

        # Determine short terminal state, quarter, and reason
        sess_status = (session_row.status if session_row else "completed").lower()
        ending_q = session_row.current_quarter if session_row else 4

        if sess_status == "bankrupt":
            terminal_status = f"BANKRUPT · Q{ending_q}"
            terminal_reason = f"Insolvency default: operating commitments exceeded treasury cash reserves in Quarter {ending_q}."
        elif sess_status == "fired":
            terminal_status = f"FIRED BY BOARD · Q{ending_q}"
            terminal_reason = f"Governance dismissal: Board confidence collapsed below statutory 30% threshold in Quarter {ending_q}."
        elif sess_status == "completed":
            terminal_status = "SURVIVED · Q4"
            terminal_reason = "Fiscal solvency & corporate governance ratified across all 4 operational quarters."
        else:
            terminal_status = f"ACTIVE · Q{ending_q}"
            terminal_reason = f"Active simulation in progress in Quarter {ending_q}."

        entry = LeaderboardRowOut(
            id=board_row.id,
            company_name=board_row.company_name,
            sector=board_row.sector,
            final_score=round(adjusted_score, 1),
            adjusted_score=round(adjusted_score, 1),
            raw_score=round(raw_score, 1),
            rank=i + 1,
            participant_name=part_name,
            masked_prn=None,  # PRN suppressed for student privacy
            branch=branch_name,
            status=sess_status.capitalize(),
            terminal_status=terminal_status,
            ending_quarter=ending_q,
            terminal_reason=terminal_reason,
            day_batch=day_batch,
            revenue_score=float(board_row.revenue_score) if board_row.revenue_score is not None else None,
            satisfaction_score=float(board_row.satisfaction_score) if board_row.satisfaction_score is not None else None,
            innovation_score=float(board_row.innovation_score) if board_row.innovation_score is not None else None,
            investor_score=float(board_row.investor_score) if board_row.investor_score is not None else None,
        )
        leaderboard_entries.append(entry)

    if batch:
        b = batch.lower().strip()
        if b in ("day1", "1"):
            leaderboard_entries = [e for e in leaderboard_entries if e.day_batch == 1]
        elif b in ("day2", "2"):
            leaderboard_entries = [e for e in leaderboard_entries if e.day_batch == 2]

    # Truncate to requested limit
    leaderboard_entries = leaderboard_entries[:limit]

    # Re-index ranks 1..N
    for rank_idx, entry in enumerate(leaderboard_entries):
        entry.rank = rank_idx + 1

    return leaderboard_entries