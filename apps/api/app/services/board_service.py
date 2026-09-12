import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.board.loader import load_board_script
from app.board.scoring import resolve_outcome
from app.models import BoardExchange, BoardSession, Company
from app.models import CompanyState as CompanyStateModel
from app.models import Session as SessionModel
from app.schemas.board import ActiveBoardExchangeOut, BoardOptionOut


async def trigger_board_session(
    db: AsyncSession, company: Company, quarter: int, trigger_reason: str
) -> BoardSession:
    script = load_board_script()

    board_session = BoardSession(
        company_id=company.id, quarter=quarter, trigger_reason=trigger_reason
    )
    db.add(board_session)
    await db.flush()

    for i, exchange_def in enumerate(script):
        db.add(
            BoardExchange(
                board_session_id=board_session.id,
                speaker=exchange_def["speaker"],
                question=exchange_def["question"],
                sequence=i,
            )
        )
    await db.commit()
    return board_session


async def get_active_board_exchange(
    db: AsyncSession, company: Company
) -> ActiveBoardExchangeOut | None:
    result = await db.execute(
        select(BoardSession)
        .where(BoardSession.company_id == company.id, BoardSession.outcome.is_(None))
        .order_by(BoardSession.started_at.desc())
    )
    board_session = result.scalars().first()
    if board_session is None:
        return None

    exchanges_result = await db.execute(
        select(BoardExchange)
        .where(BoardExchange.board_session_id == board_session.id)
        .order_by(BoardExchange.sequence)
    )
    exchanges = exchanges_result.scalars().all()

    unanswered = next((e for e in exchanges if e.chosen_response is None), None)
    if unanswered is None:
        return None

    script = load_board_script()
    script_entry = script[unanswered.sequence]

    return ActiveBoardExchangeOut(
        board_session_id=board_session.id,
        exchange_id=unanswered.id,
        speaker=unanswered.speaker,
        question=unanswered.question,
        options=[BoardOptionOut(label=o["label"]) for o in script_entry["options"]],
        sequence=unanswered.sequence,
        total_exchanges=len(exchanges),
    )


async def respond_to_board_exchange(
    db: AsyncSession, exchange_id: uuid.UUID, chosen_option_index: int, company_id: uuid.UUID
) -> tuple[float, bool, bool, float | None]:
    """Returns (confidence_delta, session_complete, fired, new_confidence)."""
    result = await db.execute(select(BoardExchange).where(BoardExchange.id == exchange_id))
    exchange = result.scalar_one_or_none()
    if exchange is None:
        raise ValueError("NOT_FOUND")

    session_result = await db.execute(
        select(BoardSession).where(BoardSession.id == exchange.board_session_id)
    )
    board_session = session_result.scalar_one()

    if board_session.company_id != company_id:
        raise ValueError("FORBIDDEN")

    if exchange.chosen_response is not None:
        raise ValueError("ALREADY_ANSWERED")

    script = load_board_script()
    script_entry = script[exchange.sequence]

    if not (0 <= chosen_option_index < len(script_entry["options"])):
        raise ValueError("INVALID_OPTION")

    option = script_entry["options"][chosen_option_index]
    exchange.chosen_response = option["label"]
    exchange.confidence_delta = option["confidence_delta"]
    await db.commit()

    all_exchanges_result = await db.execute(
        select(BoardExchange)
        .where(BoardExchange.board_session_id == board_session.id)
        .order_by(BoardExchange.sequence)
    )
    all_exchanges = all_exchanges_result.scalars().all()

    if any(e.chosen_response is None for e in all_exchanges):
        return float(option["confidence_delta"]), False, False, None

    # Last exchange just answered -- finalize.
    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == board_session.company_id,
            CompanyStateModel.quarter == board_session.quarter,
        )
    )
    state = state_result.scalar_one()

    deltas = [float(e.confidence_delta) for e in all_exchanges]
    final_confidence, fired = resolve_outcome(float(state.board_confidence), deltas)

    state.board_confidence = final_confidence
    board_session.outcome = "fired" if fired else "survived"
    board_session.ended_at = datetime.now(timezone.utc)

    if fired:
        session_result2 = await db.execute(
            select(SessionModel).where(SessionModel.id == (
                select(Company.session_id).where(Company.id == board_session.company_id).scalar_subquery()
            ))
        )
        # Simpler, explicit fetch instead of a nested subquery for clarity:
        company_result = await db.execute(select(Company).where(Company.id == board_session.company_id))
        company = company_result.scalar_one()
        session_row_result = await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
        session_row = session_row_result.scalar_one()
        session_row.status = "fired"
        session_row.ended_at = datetime.now(timezone.utc)
    else:
        company_result = await db.execute(select(Company).where(Company.id == board_session.company_id))
        company = company_result.scalar_one()
        session_row_result = await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
        session_row = session_row_result.scalar_one()
        session_row.current_stage = "planning"

    await db.commit()
    return float(option["confidence_delta"]), True, fired, final_confidence