import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest

from app.board.scoring import resolve_outcome, STATUTORY_QUORUM_CONFIDENCE_THRESHOLD
from app.models import Company, Leaderboard, Player, Session as SessionModel
from app.services.board_service import check_board_prerequisites
from app.services.leaderboard_service import get_leaderboard, PUNE_DAY1_CUTOFF


# ---------------------------------------------------------------------------
# 1. Board dismissal threshold uses correct metric and is consistent
# ---------------------------------------------------------------------------

def test_board_dismissal_threshold_evaluation():
    assert STATUTORY_QUORUM_CONFIDENCE_THRESHOLD == 30.0

    # 1. Starting at 50, delta drops to 29.9 -> Fired
    final_conf, fired = resolve_outcome(50.0, [-10.0, -10.1])
    assert fired is True
    assert final_conf == pytest.approx(29.9)

    # 2. Starting at 50, delta drops exactly to 30.0 -> Not fired
    final_conf, fired = resolve_outcome(50.0, [-10.0, -10.0])
    assert fired is False
    assert final_conf == pytest.approx(30.0)

    # 3. Starting at 20, positive delta brings to 32.0 -> Survived
    final_conf, fired = resolve_outcome(20.0, [6.0, 6.0])
    assert fired is False
    assert final_conf == pytest.approx(32.0)

    # 4. Severe penalty drops below zero -> Clamped to 0.0, fired is True
    final_conf, fired = resolve_outcome(20.0, [-30.0])
    assert fired is True
    assert final_conf == 0.0


# ---------------------------------------------------------------------------
# 2. Leaderboard Day 1 / Day 2 Classification & Batch Filtering
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_leaderboard_day1_day2_batch_filtering_and_ranks():
    # Day 1 session: earlier than cutoff
    day1_session = SessionModel(
        id=uuid.uuid4(),
        status="completed",
        current_quarter=4,
        started_at=datetime(2026, 10, 16, 10, 0, tzinfo=timezone.utc),
    )
    day1_player = Player(
        id=uuid.uuid4(),
        full_name="Day One Executive",
        department="Computer Science",
    )
    day1_lb = Leaderboard(
        id=uuid.uuid4(),
        player_id=day1_player.id,
        session_id=day1_session.id,
        company_name="Alpha Tech",
        sector="Tech",
        final_score=85.0,
    )

    # Day 2 session: later than cutoff
    day2_session = SessionModel(
        id=uuid.uuid4(),
        status="completed",
        current_quarter=4,
        started_at=datetime(2026, 10, 17, 10, 0, tzinfo=timezone.utc),
    )
    day2_player = Player(
        id=uuid.uuid4(),
        full_name="Day Two Executive",
        department="Data Science",
    )
    day2_lb = Leaderboard(
        id=uuid.uuid4(),
        player_id=day2_player.id,
        session_id=day2_session.id,
        company_name="Beta Robotics",
        sector="Robotics",
        final_score=90.0,
    )

    db = AsyncMock()
    mock_res = MagicMock()
    # Ordered by final_score desc: day2 first (90.0), then day1 (85.0)
    mock_res.all.return_value = [
        (day2_lb, day2_player, day2_session),
        (day1_lb, day1_player, day1_session),
    ]
    db.execute.return_value = mock_res

    # Overall standings: both entries present, ordered by score
    overall = await get_leaderboard(db, batch="overall")
    assert len(overall) == 2
    assert overall[0].company_name == "Beta Robotics"
    assert overall[0].rank == 1
    assert overall[0].day_batch == 2
    assert overall[1].company_name == "Alpha Tech"
    assert overall[1].rank == 2
    assert overall[1].day_batch == 1

    # Day 1 batch filter: only Day 1 entry, re-ranked as #1
    db.execute.return_value = mock_res
    day1_results = await get_leaderboard(db, batch="day1")
    assert len(day1_results) == 1
    assert day1_results[0].company_name == "Alpha Tech"
    assert day1_results[0].rank == 1
    assert day1_results[0].raw_score == 85.0

    # Day 2 batch filter: only Day 2 entry, ranked as #1
    db.execute.return_value = mock_res
    day2_results = await get_leaderboard(db, batch="day2")
    assert len(day2_results) == 1
    assert day2_results[0].company_name == "Beta Robotics"
    assert day2_results[0].rank == 1
    assert day2_results[0].raw_score == 90.0


# ---------------------------------------------------------------------------
# 3. Short Terminal Status Formatting (BANKRUPT · Qx, FIRED BY BOARD · Qx, SURVIVED · Q4)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_leaderboard_terminal_labels_short_format():
    player = Player(id=uuid.uuid4(), full_name="Test Exec")

    # Bankruptcy in Q2
    s_bankrupt = SessionModel(id=uuid.uuid4(), status="bankrupt", current_quarter=2)
    lb_bankrupt = Leaderboard(id=uuid.uuid4(), company_name="C1", sector="Tech", final_score=35.0)

    # Fired in Q3
    s_fired = SessionModel(id=uuid.uuid4(), status="fired", current_quarter=3)
    lb_fired = Leaderboard(id=uuid.uuid4(), company_name="C2", sector="Fin", final_score=40.0)

    # Survived Q4
    s_survived = SessionModel(id=uuid.uuid4(), status="completed", current_quarter=4)
    lb_survived = Leaderboard(id=uuid.uuid4(), company_name="C3", sector="Bio", final_score=78.0)

    db = AsyncMock()
    mock_res = MagicMock()
    mock_res.all.return_value = [
        (lb_survived, player, s_survived),
        (lb_fired, player, s_fired),
        (lb_bankrupt, player, s_bankrupt),
    ]
    db.execute.return_value = mock_res

    res = await get_leaderboard(db)
    assert len(res) == 3

    assert res[0].terminal_status == "SURVIVED · Q4"
    assert res[1].terminal_status == "FIRED BY BOARD · Q3"
    assert res[2].terminal_status == "BANKRUPT · Q2"
