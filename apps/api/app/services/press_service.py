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

import json
from pathlib import Path
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
from app.ai.llm_client import request_llm_completion

MAX_WORDS_PER_RESPONSE = 50

# Cache file to survive backend reloads
CACHE_FILE = Path(__file__).parent.parent / "data" / "press_sessions_cache.json"

ACTIVE_PRESS_SESSIONS: Dict[str, Dict[str, Any]] = {}

def _load_cache():
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                ACTIVE_PRESS_SESSIONS.update(json.load(f))
    except Exception:
        pass

def _save_cache():
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(ACTIVE_PRESS_SESSIONS, f)
    except Exception:
        pass

_load_cache()


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
    1. Quarter is 1 or 2 (interactive journalist interviews are restricted to Q1 and Q2).
    2. F&O, Market, and R&D are complete for the current quarter.
    """
    if quarter > 2:
        return False, "Press conferences are restricted to Q1 and Q2 in this campaign."

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
            return False, "Finance & Operations must be committed before accessing Press World."

    # Check Market
    market_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "strategic_marketing",
        )
    )
    if not market_res.scalar_one_or_none():
        return False, "Marketing strategy must be committed before accessing Press World."

    # Check R&D
    rd_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["rd", "research_development"]),
        )
    )
    if not rd_res.scalar_one_or_none():
        return False, "Research & Development must be committed before accessing Press World."

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
            "current_exchange_index": 1 if quarter == 2 else 3,
            "total_exchanges": 1 if quarter == 2 else 3,
        }

    # 2. If quarter > 2: Passive Press Coverage (Corporate Times news generation based directly on HQ Ops and Client Negos)
    if quarter > 2:
        quarter_logs_res = await db.execute(
            select(DecisionLog).where(
                DecisionLog.company_id == company.id,
                DecisionLog.quarter == quarter,
            )
        )
        quarter_logs = {l.decision_type: l for l in quarter_logs_res.scalars().all()}
        budget_log = quarter_logs.get("budget")
        client_log = quarter_logs.get("client_negotiation") or quarter_logs.get("client_remediation") or quarter_logs.get("client_deal")
        market_log = quarter_logs.get("strategic_marketing")
        rd_log = quarter_logs.get("rd", quarter_logs.get("research_development"))

        has_ops = budget_log is not None
        has_market = market_log is not None
        has_rd = rd_log is not None

        from app.services.client_negotiation_service import get_scheduled_followup_deal
        try:
            scheduled_deal = await get_scheduled_followup_deal(db, company, quarter)
        except Exception:
            scheduled_deal = None

        has_client = True if scheduled_deal is None else (client_log is not None)

        if not (has_ops and has_market and has_rd and has_client):
            reasons = []
            if not has_ops:
                reasons.append("Finance & Operations")
            if not has_market:
                reasons.append("Strategic Marketing")
            if not has_rd:
                reasons.append("Research & Development")
            if not has_client:
                reasons.append("Client World follow-up")
            reason_str = f"Complete required quarter activities first: {', '.join(reasons)}."
            return {
                "quarter": quarter,
                "status": "LOCKED",
                "is_locked": True,
                "lock_reason": reason_str,
                "headline": "CLEARANCE RESTRICTED // PREREQUISITES PENDING",
                "article_body": f"Corporate Times journalists require completion of all Quarter {quarter} HQ departments and Client World reviews.",
                "media_verdict": "Clearance pending.",
                "current_exchange_index": 0,
                "total_exchanges": 0,
            }

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

        # Attempt report generation via Groq -> Gemini -> Fallback
        prompt_events = (
            f"Company: {company.name} (Sector: {company.sector})\n"
            f"Quarter: {quarter}\n"
            f"Operations Budget: {budget_log.summary if budget_log else 'Standard department operations'}\n"
            f"Marketing Directive: {market_log.summary if market_log else 'Ongoing marketing campaigns'}\n"
            f"R&D Choice: {rd_log.summary if rd_log else 'Ongoing research development'}\n"
            f"Client Accounts: {client_log.summary if client_log else 'No pending client disputes'}\n"
            f"Liquid Cash: ₹{cash_val:,.0f}, Corporate Risk: {risk_val:.1f}%, Market Share: {mkt_share_val:.1f}%\n"
        )
        sys_prompt = (
            "You are the senior financial journalist for The Corporate Times in Corporate Apocalypse 2400.\n"
            "Write a truthful frontpage news dispatch based ONLY on the actual company decisions provided in context.\n"
            "Never invent false events, numbers, or actions. Respond strictly in JSON:\n"
            "{\n"
            '  "headline": "PUNCHY CAPITALIZED HEADLINE UNDER 12 WORDS",\n'
            '  "article_body": "2 to 3 concise journalistic paragraphs reporting the exact events and fiscal standing",\n'
            '  "media_verdict": "1-2 sentence editorial verdict from New Kalki Financial Press"\n'
            "}"
        )
        llm_parsed = False
        try:
            llm_raw = await request_llm_completion(sys_prompt, prompt_events, temperature=0.3, max_tokens=500)
            if llm_raw:
                cleaned = llm_raw.strip()
                if "```json" in cleaned:
                    cleaned = cleaned.split("```json")[1].split("```")[0].strip()
                elif "```" in cleaned:
                    cleaned = cleaned.split("```")[1].split("```")[0].strip()
                data = json.loads(cleaned)
                if data.get("headline") and data.get("article_body"):
                    headline = str(data["headline"]).strip().upper()
                    article_body = str(data["article_body"]).strip()
                    media_verdict = str(data.get("media_verdict", f"The Corporate Times monitors {company.name}'s ongoing governance.")).strip()
                    llm_parsed = True
        except Exception:
            pass

        if not llm_parsed:
            if budget_log and client_log:
                headline = f"{company.name.upper()} ORCHESTRATES Q{quarter} BUDGET & SETTLES ENTERPRISE CLIENT AUDIT"
            elif client_log:
                headline = f"{company.name.upper()} RATIFIES KEY CLIENT SLA TERMS IN Q{quarter}"
            elif market_log:
                headline = f"{company.name.upper()} RATIFIES STRATEGIC DIRECTIVE IN Q{quarter}"
            elif rd_log:
                headline = f"{company.name.upper()} ADVANCES R&D INITIATIVE IN Q{quarter}"
            elif budget_log:
                headline = f"{company.name.upper()} CONCLUDES Q{quarter} BUDGET ALLOCATIONS"
            else:
                headline = f"{company.name.upper()} CONSOLIDATES STABILITY IN Q{quarter}"

        article_paragraphs = [
            f"NEW KALKI CITY (CORPORATE TIMES WIRE) — In a decisive Quarter {quarter} corporate cycle, {company.name} navigated market scrutiny without convening an open podium press conference, transmitting statutory operational and commercial disclosures directly to municipal financial desks."
        ]

        # 1. HQ Operations Budget
        if budget_log:
            article_paragraphs.append(
                f"HEADQUARTERS OPERATIONS // Balance sheet records verify that executive leadership concluded comprehensive department allocations: {budget_log.summary}. Internal audits indicate disciplined liquidity management aimed at sustaining core operations and maintaining working capital."
            )

        # 2. Client Negotiations & SLA Remediation
        if client_log:
            comp_paid = (
                client_log.stat_deltas.get("compensation_paid")
                or client_log.stat_deltas.get("compensation_amount")
            ) if isinstance(client_log.stat_deltas, dict) else None
            client_name = client_log.stat_deltas.get("client_name") if isinstance(client_log.stat_deltas, dict) else "enterprise account partners"
            status_update = client_log.stat_deltas.get("status_update") if isinstance(client_log.stat_deltas, dict) else ""
            if comp_paid:
                update_quote = f' In executive communications, the CEO affirmed: "{status_update}".' if status_update else ""
                article_paragraphs.append(
                    f"COMMERCIAL ACCOUNTS // Following HQ operations, {company.name} concluded crucial SLA remediation negotiations with {client_name}. "
                    f"Facing audit scrutiny over deliverable benchmarks, executive leadership authorized a ₹{comp_paid:,.0f} restitution rebate to settle variances and protect key enterprise account retention.{update_quote} "
                    f"Corporate audit desks confirm the settlement effectively mitigates legal escalation risks and restores institutional client trust."
                )
            else:
                article_paragraphs.append(
                    f"COMMERCIAL ACCOUNTS // In corporate procurement, {company.name} maintained direct alignment with key clients: {client_log.summary}. Contract directors confirmed ongoing SLA compliance and relationship stability across primary partner accounts."
                )

        # 3. Market & R&D directives
        if market_log:
            article_paragraphs.append(
                f"MARKET INTELLIGENCE // Commercial watchers note the ratification of a pivotal macroeconomic directive: {market_log.summary}."
            )
        if rd_log:
            article_paragraphs.append(
                f"ENGINEERING DIRECTIVE // In technology development, {company.name}'s engineering arm advanced strategic pipeline milestones: {rd_log.summary}."
            )

        article_paragraphs.append(
            f"FINANCIAL DOSSIER // Corporate telemetry registers liquid treasury reserves at ₹{cash_val:,.0f} with corporate risk rated at {risk_val:.1f}% and market share at {mkt_share_val:.1f}%. Observers characterize executive performance as methodical and well-positioned ahead of upcoming board inquiries."
        )

        article_body = "\n\n".join(article_paragraphs)
        media_verdict = (
            f"The Corporate Times editorial desk rates {company.name}'s Q{quarter} operations as accountable, client-responsive, and commercially stable."
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
    total_exchanges = 1 if quarter == 2 else 3
    if not can_access:
        return {
            "quarter": quarter,
            "status": "LOCKED",
            "lock_reason": reason,
            "current_exchange_index": 0,
            "total_exchanges": total_exchanges,
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

    total_exchanges = 1 if quarter == 2 else 3
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
        "current_exchange_index": 0,  # 0: waiting for first response
        "total_exchanges": total_exchanges,
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

    total_exchanges = session_data.get("total_exchanges", 1 if quarter == 2 else 3)
    exchange_idx = session_data["current_exchange_index"]
    if exchange_idx >= total_exchanges:
        raise ValueError("All statements for this press conference have already been submitted.")

    session_data["statements"].append(statement.strip())
    session_data["current_exchange_index"] += 1

    if session_data["current_exchange_index"] < total_exchanges:
        # Generate follow-up question via LLM pipeline (for Q1 follow-up exchanges)
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
            "total_exchanges": total_exchanges,
            "next_question": next_q,
            "tone": session_data["latest_tone"],
            "journalist_notes": session_data["journalist_notes"],
            "statements": session_data["statements"],
            "questions": session_data["questions"],
        }

    # Final exchange completed! (1 response in Q2, or 3 responses in Q1)
    final_eval = await evaluate_press_step_llm(
        crisis_context=session_data["crisis_context"],
        statements=session_data["statements"],
        exchange_index=session_data["current_exchange_index"],
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
        "current_exchange_index": total_exchanges,
        "total_exchanges": total_exchanges,
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
