import uuid
from datetime import datetime, timezone
from app.services.scoring_service import finalize_game
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.board.loader import load_board_script
from app.board.scoring import resolve_outcome
from app.models import BoardExchange, BoardSession, Company, DecisionLog
from app.models import CompanyState as CompanyStateModel
from app.models import Session as SessionModel
from app.schemas.board import ActiveBoardExchangeOut, BoardOptionOut


async def check_board_prerequisites(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> tuple[bool, str]:
    """
    Verifies that all 5 activities in the current quarter are DONE:
    1. Finance & Operations (budget DecisionLog or next quarter state row)
    2. Market & Acquisitions (strategic_marketing DecisionLog)
    3. R&D (rd or research_development DecisionLog)
    4. Client World (client_negotiation DecisionLog or closed contract)
    5. Press World (press DecisionLog)
    """
    # 1. Ops
    ops_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "budget",
        )
    )
    if not ops_res.scalar_one_or_none():
        next_state = await db.execute(
            select(CompanyStateModel).where(
                CompanyStateModel.company_id == company.id,
                CompanyStateModel.quarter == quarter + 1,
            )
        )
        if not next_state.scalar_one_or_none():
            return False, "Finance & Operations must be committed before convening the Board."

    # 2. Market
    market_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "strategic_marketing",
        )
    )
    if not market_res.scalar_one_or_none():
        return False, "Marketing strategy must be committed before convening the Board."

    # 3. R&D
    rd_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["rd", "research_development"]),
        )
    )
    if not rd_res.scalar_one_or_none():
        return False, "Research & Development must be committed before convening the Board."

    # 4. Client World (for Q1/Q2, require completed negotiation)
    if quarter <= 2:
        client_res = await db.execute(
            select(DecisionLog).where(
                DecisionLog.company_id == company.id,
                DecisionLog.quarter == quarter,
                DecisionLog.decision_type.in_(["client_negotiation", "client_deal"]),
            )
        )
        if not client_res.scalar_one_or_none():
            return False, "Client contract negotiation must be concluded before convening the Board."

    # 5. Press World (for Q1/Q2, require completed press conference)
    if quarter <= 2:
        press_res = await db.execute(
            select(DecisionLog).where(
                DecisionLog.company_id == company.id,
                DecisionLog.quarter == quarter,
                DecisionLog.decision_type == "press",
            )
        )
        if not press_res.scalar_one_or_none():
            return False, "Press conference must be concluded before convening the Board."

    return True, ""


async def trigger_board_session(
    db: AsyncSession, company: Company, quarter: int, trigger_reason: str
) -> BoardSession:
    # Check if active board session already exists for this quarter
    existing_session = await db.execute(
        select(BoardSession).where(
            BoardSession.company_id == company.id,
            BoardSession.quarter == quarter,
            BoardSession.outcome.is_(None),
        )
    )
    active = existing_session.scalars().first()
    if active:
        return active

    script = load_board_script(quarter)

    # Load contextual activities to enrich the questions
    logs_result = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
        )
    )
    logs = {l.decision_type: l for l in logs_result.scalars().all()}
    client_summary = logs.get("client_negotiation", logs.get("client_deal"))
    press_summary = logs.get("press")
    rd_summary = logs.get("rd", logs.get("research_development"))
    market_summary = logs.get("strategic_marketing")

    board_session = BoardSession(
        company_id=company.id, quarter=quarter, trigger_reason=trigger_reason
    )
    db.add(board_session)
    await db.flush()

    for i, exchange_def in enumerate(script):
        question_text = exchange_def["question"]
        # Contextualize questions based on actual quarter activities
        if exchange_def["speaker"] == "chairperson" and press_summary:
            question_text = f"The board convened following the recent press spotlight ({press_summary.summary}). Walk us through your executive rationale."
        elif exchange_def["speaker"] == "lead_investor" and client_summary:
            question_text = f"Regarding our commercial pipeline ({client_summary.summary}), our return targets are under immense scrutiny. How do we ensure target ROI?"
        elif exchange_def["speaker"] == "independent_director" and rd_summary:
            question_text = f"Concerning our R&D roadmap ({rd_summary.summary}), do your operational risks align with our stated governance standards?"

        db.add(
            BoardExchange(
                board_session_id=board_session.id,
                speaker=exchange_def["speaker"],
                question=question_text,
                sequence=i,
            )
        )
    await db.commit()
    return board_session


async def get_active_board_exchange(
    db: AsyncSession, company: Company
) -> ActiveBoardExchangeOut | None:
    # 1. Fetch current session row to know active quarter
    session_row_res = await db.execute(
        select(SessionModel).where(SessionModel.id == company.session_id)
    )
    session_row = session_row_res.scalar_one_or_none()
    if session_row and hasattr(session_row, "status") and session_row.status in ["bankrupt", "fired", "completed"]:
        return None
    current_q = session_row.current_quarter if session_row else 1

    result = await db.execute(
        select(BoardSession)
        .where(BoardSession.company_id == company.id, BoardSession.outcome.is_(None))
        .order_by(BoardSession.started_at.desc())
    )
    board_session = result.scalars().first()

    # If no active board session exists, check if prerequisites are met to auto-trigger Q-end board meeting
    if board_session is None:
        can_access, _ = await check_board_prerequisites(db, company, current_q)
        if can_access:
            board_session = await trigger_board_session(
                db, company, current_q, trigger_reason="quarter_end_review"
            )
        else:
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

    script = load_board_script(board_session.quarter)
    script_entry = script[unanswered.sequence]

    return ActiveBoardExchangeOut(
        board_session_id=board_session.id,
        exchange_id=unanswered.id,
        quarter=board_session.quarter,
        speaker=unanswered.speaker,
        question=unanswered.question,
        options=[BoardOptionOut(label=o["label"]) for o in script_entry["options"]],
        sequence=unanswered.sequence,
        total_exchanges=len(exchanges),
    )


async def respond_to_board_exchange(
    db: AsyncSession, exchange_id: uuid.UUID, chosen_option_index: int, company_id: uuid.UUID
) -> tuple[float, bool, bool, float | None, int | None, int | None]:
    """Returns (confidence_delta, session_complete, fired, new_confidence, completed_quarter, next_quarter)."""
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

    script = load_board_script(board_session.quarter)
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
        return float(option["confidence_delta"]), False, False, None, None, None

    # Last exchange just answered -- finalize.
    # Prevent duplicate finalization if already finalized
    if board_session.outcome is not None:
        completed_q = board_session.quarter
        next_q = completed_q + 1 if completed_q < 4 else None
        return float(option["confidence_delta"]), True, board_session.outcome == "fired", None, completed_q, next_q

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

    # Persist DecisionLog for board meeting outcome
    total_delta = sum(deltas)
    db.add(
        DecisionLog(
            company_id=board_session.company_id,
            quarter=board_session.quarter,
            decision_type="board_meeting",
            summary=f"Board meeting concluded: {'CEO DISMISSED' if fired else 'CONFIDENCE RATIFIED'} (Net confidence: {total_delta:+.0f}).",
            stat_deltas={"board_confidence": total_delta},
        )
    )

    company_result = await db.execute(select(Company).where(Company.id == board_session.company_id))
    company = company_result.scalar_one()
    session_row_result = await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
    session_row = session_row_result.scalar_one()

    completed_quarter = board_session.quarter
    next_quarter = None

    if fired:
        session_row.status = "fired"
        session_row.ended_at = datetime.now(timezone.utc)
        await finalize_game(db, company)
    else:
        # ADVANCE QUARTER AUTHORITATIVELY!
        old_quarter = session_row.current_quarter
        if old_quarter < 4:
            new_quarter = old_quarter + 1
            next_quarter = new_quarter
            session_row.current_quarter = new_quarter
            session_row.current_stage = "planning"

            # Check if next quarter's CompanyState row already exists (e.g. from operations tick)
            next_state_res = await db.execute(
                select(CompanyStateModel).where(
                    CompanyStateModel.company_id == company.id,
                    CompanyStateModel.quarter == new_quarter,
                )
            )
            next_state = next_state_res.scalar_one_or_none()
            if next_state:
                # Synchronize next_state with authoritative cumulative balances from completed quarter
                # (incorporating client deal cash, revenue, market decisions, R&D, etc.)
                next_state.cash = float(state.cash)
                next_state.revenue = float(state.revenue)
                next_state.profit = float(state.profit)
                next_state.debt = float(state.debt)
                next_state.stock_price = float(state.stock_price)
                next_state.employees = state.employees
                next_state.innovation = float(state.innovation)
                next_state.brand = float(state.brand)
                next_state.client_satisfaction = float(state.client_satisfaction)
                next_state.employee_satisfaction = float(state.employee_satisfaction)
                next_state.investor_confidence = float(state.investor_confidence)
                next_state.esg = float(state.esg)
                next_state.risk = float(state.risk)
                next_state.market_share = float(state.market_share)
                next_state.board_confidence = final_confidence
            else:
                # Create next quarter state row inheriting current state with updated board confidence
                next_state = CompanyStateModel(
                    company_id=company.id,
                    quarter=new_quarter,
                    cash=float(state.cash),
                    revenue=float(state.revenue),
                    profit=float(state.profit),
                    debt=float(state.debt),
                    stock_price=float(state.stock_price),
                    employees=state.employees,
                    innovation=float(state.innovation),
                    brand=float(state.brand),
                    client_satisfaction=float(state.client_satisfaction),
                    employee_satisfaction=float(state.employee_satisfaction),
                    investor_confidence=float(state.investor_confidence),
                    esg=float(state.esg),
                    risk=float(state.risk),
                    market_share=float(state.market_share),
                    board_confidence=final_confidence,
                )
                db.add(next_state)
        else:
            # Quarter 4 complete -> Game completed successfully!
            session_row.status = "completed"
            session_row.ended_at = datetime.now(timezone.utc)
            session_row.current_stage = "report"
            await finalize_game(db, company)

    await db.commit()
    return float(option["confidence_delta"]), True, fired, final_confidence, completed_quarter, next_quarter