"""
Authoritative Press Service for Corporate Apocalypse 2400.
Handles:
- Gate checks: Q1 & Q2 only (Q3/Q4 passive), F&O + Market + R&D completed before Press unlocks.
- Single sentence & <= 50 words validation.
- Exactly 3 CEO responses (initial statement + 2 follow-ups).
- Idempotent state application and DecisionLog recording.
- Bounded KPI updates to brand, investor_confidence, risk, board_confidence.
- Appending headlines to CorporateTimesIssue.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Company,
    CompanyState as CompanyStateModel,
    CorporateTimesIssue,
    DecisionLog,
    Player,
    Session as SessionModel,
)
from app.services.press_scenarios import build_press_crisis_context
from app.services.llm_press_service import evaluate_press_step_llm

MAX_WORDS_PER_RESPONSE = 50

# In-memory session tracker for the active conference in-progress prior to final commit
# Keyed by (company_id_str, quarter)
ACTIVE_PRESS_SESSIONS: Dict[str, Dict[str, Any]] = {}


def _clamp(val: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, val))


def validate_ceo_statement(statement: str) -> Tuple[bool, str]:
    """
    Validates:
    - Non-empty
    - <= 50 words
    - Maximum 1 sentence (no multiple terminal punctuation marks like '. ', '! ', '? ')
    """
    cleaned = statement.strip()
    if not cleaned:
        return False, "Statement cannot be empty."

    words = cleaned.split()
    if len(words) > MAX_WORDS_PER_RESPONSE:
        return False, f"Statement exceeds limit: {len(words)}/{MAX_WORDS_PER_RESPONSE} words."

    # Sentence boundary check:
    # A single sentence should not have sentence breaks followed by capital letters or spaces and more text.
    # Count sentence terminators [.!?]
    terminators = re.findall(r"[.!?]+(?:\s+|$)", cleaned)
    # If there are multiple terminators separated by words, it's multiple sentences.
    sentences = [s.strip() for s in re.split(r"[.!?]+", cleaned) if s.strip()]
    if len(sentences) > 1:
        return False, f"Statement must be exactly one sentence maximum (detected {len(sentences)} sentences)."

    return True, ""


async def check_press_prerequisites(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> Tuple[bool, str]:
    """
    Verifies:
    1. Quarter is 1 or 2 (Q3 and Q4 do not allow interactive press conferences).
    2. F&O, Market, and R&D are complete for the current quarter.
    """
    if quarter > 2:
        return False, f"Press conferences are restricted to Q1 and Q2. Quarter {quarter} coverage is passive."

    # Check Operations
    ops_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "budget",
        )
    )
    if not ops_res.scalar_one_or_none():
        # Check next state
        next_state = await db.execute(
            select(CompanyStateModel).where(
                CompanyStateModel.company_id == company.id,
                CompanyStateModel.quarter == quarter + 1,
            )
        )
        if not next_state.scalar_one_or_none():
            return False, "Finance & Operations must be committed before attending the Press Conference."

    # Check Market
    market_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "strategic_marketing",
        )
    )
    if not market_res.scalar_one_or_none():
        return False, "Marketing strategy must be committed before attending the Press Conference."

    # Check R&D
    rd_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["rd", "research_development"]),
        )
    )
    if not rd_res.scalar_one_or_none():
        return False, "Research & Development must be committed before attending the Press Conference."

    return True, ""


async def get_or_create_press_session(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> Dict[str, Any]:
    """
    Retrieves the current press session. If already completed, returns the persisted outcome.
    If in progress, returns the current exchange state.
    If not started, creates the contextual crisis scenario.
    """
    # 1. Check if already completed and recorded in DecisionLog
    press_log_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "press",
        )
    )
    press_log = press_log_res.scalar_one_or_none()
    if press_log:
        deltas = press_log.stat_deltas if isinstance(press_log.stat_deltas, dict) else {}
        numeric_deltas = {k: float(v) for k, v in deltas.items() if isinstance(v, (int, float))}
        return {
            "quarter": quarter,
            "status": "COMPLETED",
            "summary": press_log.summary,
            "stat_deltas": numeric_deltas,
            "headline": deltas.get("headline", press_log.summary),
            "article_body": deltas.get("article_body", ""),
            "media_verdict": deltas.get("media_verdict", ""),
            "tone": deltas.get("tone", "NEUTRAL"),
            "commitments": deltas.get("commitments", []),
            "statements": deltas.get("statements", []),
            "questions": deltas.get("questions", []),
            "score": deltas.get("score"),
            "current_exchange_index": 3,
            "total_exchanges": 3,
        }

    # 2. If quarter > 2: Passive Press Coverage (Corporate Times news generation based on real decisions)
    if quarter > 2:
        quarter_logs_res = await db.execute(
            select(DecisionLog).where(
                DecisionLog.company_id == company.id,
                DecisionLog.quarter == quarter,
            )
        )
        quarter_logs = {l.decision_type: l for l in quarter_logs_res.scalars().all()}
        budget_log = quarter_logs.get("budget")
        market_log = quarter_logs.get("strategic_marketing")
        rd_log = quarter_logs.get("rd", quarter_logs.get("research_development"))

        state_res = await db.execute(
            select(CompanyStateModel).where(
                CompanyStateModel.company_id == company.id,
                CompanyStateModel.quarter == quarter,
            )
        )
        state = state_res.scalar_one_or_none()
        cash_val = float(state.cash) if state else 0.0
        risk_val = float(state.risk) if state else 20.0
        mkt_share_val = float(state.market_share) if state else 10.0

        if market_log:
            headline = f"{company.name.upper()} RATIFIES STRATEGIC DIRECTIVE IN Q{quarter}"
        elif rd_log:
            headline = f"{company.name.upper()} ADVANCES R&D INITIATIVE IN Q{quarter}"
        elif budget_log:
            headline = f"{company.name.upper()} CONCLUDES Q{quarter} BUDGET ALLOCATIONS"
        else:
            headline = f"{company.name.upper()} CONSOLIDATES STABILITY IN Q{quarter}"

        article_paragraphs = [
            f"NEW KALKI CITY (CORPORATE TIMES WIRE) — In a decisive Quarter {quarter} reporting cycle, {company.name} maintained its operational footprint across the metropolis without summoning an interactive podium conference, transmitting corporate disclosures directly through official statutory channels."
        ]
        if market_log:
            article_paragraphs.append(
                f"Commercial intelligence confirms the ratification of a pivotal market mandate: {market_log.summary}."
            )
        if rd_log:
            article_paragraphs.append(
                f"In engineering and technology development, research directors committed capital to critical pipeline advancements: {rd_log.summary}."
            )
        if budget_log:
            article_paragraphs.append(
                f"On the balance sheet, executive management concluded comprehensive department allocations: {budget_log.summary}."
            )

        article_paragraphs.append(
            f"Corporate surveillance records liquid reserves at ₹{cash_val:,.0f} with systemic risk rated at {risk_val:.1f} points and market share standing at {mkt_share_val:.1f}%. Financial observers characterize the passive press posture as disciplined execution in anticipation of board audit scrutiny."
        )

        article_body = "\n\n".join(article_paragraphs)
        media_verdict = (
            f"Corporate Times market editors view {company.name}'s Q{quarter} posture as orderly, risk-conscious, and compliant with enterprise governance standards."
        )

        press_log = DecisionLog(
            company_id=company.id,
            quarter=quarter,
            decision_type="press",
            summary=f"Corporate Times: {headline}",
            stat_deltas={
                "headline": headline,
                "article_body": article_body,
                "media_verdict": media_verdict,
                "passive": True,
                "quarter": quarter,
            },
        )
        db.add(press_log)

        issue_res = await db.execute(
            select(CorporateTimesIssue).where(
                CorporateTimesIssue.session_id == company.session_id,
                CorporateTimesIssue.quarter == quarter,
            )
        )
        issue = issue_res.scalar_one_or_none()
        if issue:
            events = list(issue.market_events) if isinstance(issue.market_events, list) else []
            events.append(f"PRESS DISPATCH: {headline} - {media_verdict}")
            issue.market_events = events

        await db.commit()
        await db.refresh(press_log)

        return {
            "quarter": quarter,
            "status": "COMPLETED",
            "summary": press_log.summary,
            "stat_deltas": {},
            "headline": headline,
            "article_body": article_body,
            "media_verdict": media_verdict,
            "tone": "ANALYTICAL",
            "commitments": [],
            "statements": [],
            "questions": [],
            "score": 75,
            "current_exchange_index": 3,
            "total_exchanges": 3,
        }

    # 2. Check prerequisites for Q1/Q2
    can_access, reason = await check_press_prerequisites(db, company, quarter)
    if not can_access:
        return {
            "quarter": quarter,
            "status": "LOCKED",
            "lock_reason": reason,
            "current_exchange_index": 0,
            "total_exchanges": 3,
        }

    session_key = f"{company.id}:{quarter}"
    if session_key in ACTIVE_PRESS_SESSIONS:
        return ACTIVE_PRESS_SESSIONS[session_key]

    # 3. Build new contextual crisis dossier
    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_res.scalar_one_or_none()
    state_dict = {}
    if state:
        state_dict = {
            "cash": float(state.cash),
            "revenue": float(state.revenue),
            "debt": float(state.debt),
            "brand": float(state.brand),
            "market_share": float(state.market_share),
            "investor_confidence": float(state.investor_confidence),
        }

    # Load all previous decision logs up to current quarter
    logs_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter <= quarter,
        ).order_by(DecisionLog.created_at.asc())
    )
    decision_logs = [
        {
            "quarter": l.quarter,
            "decision_type": l.decision_type,
            "summary": l.summary,
            "stat_deltas": l.stat_deltas,
        }
        for l in logs_res.scalars().all()
    ]

    # Retrieve player name (CEO)
    ceo_name = None
    if company.session_id:
        sess_res = await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
        sess = sess_res.scalar_one_or_none()
        if sess and sess.player_id:
            player_res = await db.execute(select(Player).where(Player.id == sess.player_id))
            player = player_res.scalar_one_or_none()
            if player:
                ceo_name = player.full_name

    crisis_context = build_press_crisis_context(
        company_name=company.name,
        sector=company.sector,
        quarter=quarter,
        company_state=state_dict,
        decision_logs=decision_logs,
        ceo_name=ceo_name,
    )
    if ceo_name:
        crisis_context["ceo_name"] = ceo_name

    new_session = {
        "quarter": quarter,
        "status": "ACTIVE",
        "crisis_context": crisis_context,
        "journalist": crisis_context["journalist"],
        "headline": crisis_context["headline"],
        "context": crisis_context["context"],
        "established_facts": crisis_context["established_facts"],
        "current_question": crisis_context["opening_question"],
        "questions": [crisis_context["opening_question"]],
        "statements": [],
        "current_exchange_index": 0,  # 0: waiting for first response; 1: follow-up 1; 2: follow-up 2
        "total_exchanges": 3,
    }
    ACTIVE_PRESS_SESSIONS[session_key] = new_session
    return new_session


async def submit_press_response(
    db: AsyncSession,
    company: Company,
    quarter: int,
    statement: str,
) -> Dict[str, Any]:
    """
    Submits a CEO response.
    - Validates 1 sentence and <= 50 words.
    - If exchange 0 or 1: triggers follow-up question via LLM pipeline.
    - If exchange 2: evaluates complete press conference, computes authoritative KPI deltas,
      records DecisionLog, appends to CorporateTimesIssue, and closes session.
    """
    # Check if already completed in DB
    existing_log_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "press",
        )
    )
    if existing_log_res.scalar_one_or_none():
        raise ValueError("Press conference for this quarter is already concluded.")

    # Validate statement
    is_valid, err_msg = validate_ceo_statement(statement)
    if not is_valid:
        raise ValueError(err_msg)

    session_key = f"{company.id}:{quarter}"
    session_data = await get_or_create_press_session(db, company, quarter)
    if session_data.get("status") == "LOCKED":
        raise ValueError(session_data.get("lock_reason", "Press conference is locked."))

    exchange_idx = session_data["current_exchange_index"]
    if exchange_idx >= 3:
        raise ValueError("All 3 statements for this press conference have already been submitted.")

    session_data["statements"].append(statement.strip())
    session_data["current_exchange_index"] += 1

    if session_data["current_exchange_index"] < 3:
        # Generate follow-up question via LLM pipeline
        llm_res = await evaluate_press_step_llm(
            crisis_context=session_data["crisis_context"],
            statements=session_data["statements"],
            exchange_index=session_data["current_exchange_index"],
            company_name=company.name,
            is_final=False,
        )
        next_q = llm_res.get("follow_up_question") or (
            "CEO, that does not clarify the operational risks—how do you answer the public?"
        )
        session_data["questions"].append(next_q)
        session_data["current_question"] = next_q
        session_data["latest_tone"] = llm_res.get("tone", "NEUTRAL")
        session_data["journalist_notes"] = llm_res.get("journalist_notes", "")
        ACTIVE_PRESS_SESSIONS[session_key] = session_data

        return {
            "status": "ACTIVE",
            "current_exchange_index": session_data["current_exchange_index"],
            "total_exchanges": 3,
            "next_question": next_q,
            "tone": session_data["latest_tone"],
            "journalist_notes": session_data["journalist_notes"],
            "statements": session_data["statements"],
            "questions": session_data["questions"],
        }

    # Final exchange completed! (3 responses received)
    final_eval = await evaluate_press_step_llm(
        crisis_context=session_data["crisis_context"],
        statements=session_data["statements"],
        exchange_index=3,
        company_name=company.name,
        is_final=True,
    )

    tone = final_eval.get("tone", "NEUTRAL")
    headline = final_eval.get("headline", f"{company.name.upper()} COMPLETES PRESS INQUIRY")
    article_body = final_eval.get("article_body", "The press conference adjourned with mixed market reactions.")
    media_verdict = final_eval.get("media_verdict", "The corporate statement remains on official record.")
    commitments = final_eval.get("commitments", [])
    score = final_eval.get("score", 60)

    # Compute authoritative KPI deltas based on tone and score
    if tone == "FAVOURABLE":
        stat_deltas = {
            "brand": +4.0,
            "investor_confidence": +3.5,
            "risk": -3.0,
            "board_confidence": +4.0,
        }
    elif tone == "NEUTRAL":
        stat_deltas = {
            "brand": +0.5,
            "investor_confidence": +0.0,
            "risk": -0.5,
            "board_confidence": +1.0,
        }
    elif tone == "SCEPTICAL":
        stat_deltas = {
            "brand": -2.5,
            "investor_confidence": -2.0,
            "risk": +2.0,
            "board_confidence": -2.0,
        }
    else:  # DAMAGING
        stat_deltas = {
            "brand": -6.0,
            "investor_confidence": -5.0,
            "risk": +5.0,
            "board_confidence": -5.0,
        }

    # Update company state
    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_res.scalar_one_or_none()
    if state:
        state.brand = _clamp(float(state.brand) + stat_deltas["brand"])
        state.investor_confidence = _clamp(float(state.investor_confidence) + stat_deltas["investor_confidence"])
        state.risk = _clamp(float(state.risk) + stat_deltas["risk"])
        state.board_confidence = _clamp(float(state.board_confidence) + stat_deltas["board_confidence"])

    # Persist DecisionLog
    stat_deltas_with_metadata = dict(stat_deltas)
    stat_deltas_with_metadata["headline"] = headline
    stat_deltas_with_metadata["article_body"] = article_body
    stat_deltas_with_metadata["media_verdict"] = media_verdict
    stat_deltas_with_metadata["tone"] = tone
    stat_deltas_with_metadata["commitments"] = commitments
    stat_deltas_with_metadata["statements"] = session_data["statements"]
    stat_deltas_with_metadata["questions"] = session_data["questions"]
    stat_deltas_with_metadata["score"] = score

    decision_log = DecisionLog(
        company_id=company.id,
        quarter=quarter,
        decision_type="press",
        summary=f"Press Conference: {headline}",
        stat_deltas=stat_deltas_with_metadata,
    )
    db.add(decision_log)

    # Weave into CorporateTimesIssue if present
    issue_res = await db.execute(
        select(CorporateTimesIssue).where(
            CorporateTimesIssue.session_id == company.session_id,
            CorporateTimesIssue.quarter == quarter,
        )
    )
    issue = issue_res.scalar_one_or_none()
    if issue and isinstance(issue.market_events, list):
        events = list(issue.market_events)
        events.append(f"PRESS DISPATCH: {headline}")
        issue.market_events = events

    await db.commit()
    if state:
        await db.refresh(state)

    # Clean up in-memory session
    ACTIVE_PRESS_SESSIONS.pop(session_key, None)

    return {
        "status": "COMPLETED",
        "current_exchange_index": 3,
        "total_exchanges": 3,
        "headline": headline,
        "article_body": article_body,
        "media_verdict": media_verdict,
        "tone": tone,
        "commitments": commitments,
        "score": score,
        "stat_deltas": stat_deltas,
        "statements": session_data["statements"],
        "questions": session_data["questions"],
        "new_brand": float(state.brand) if state else 50.0,
        "new_investor_confidence": float(state.investor_confidence) if state else 50.0,
        "new_risk": float(state.risk) if state else 20.0,
        "new_board_confidence": float(state.board_confidence) if state else 50.0,
    }
