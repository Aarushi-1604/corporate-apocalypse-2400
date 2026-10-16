"""
Deterministic Client World Negotiation Engine
Authoritative game-engine logic for multi-stage commercial negotiations:
- Stage 1: Requirement introduction
- Stage 2: Discovery details
- Stage 3: Pursue or Reject
- Stage 4: Pitch Evaluation (LLM)
- Stage 5: Client Reaction (deterministic branches)
- Stage 6: Price Quoting & Validation
- Stage 7: Deal Resolution & State Persistence (Accepted, Counteroffer, Rejected, Walked Away)
"""

import json
import math
import re
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, CompanyState as CompanyStateModel, Contract, DecisionLog, Session as SessionModel
from app.services.client_scenarios import get_scenario_for_company
from app.services.llm_negotiation_service import evaluate_client_pitch
from app.ai.llm_client import request_llm_completion


STAGE_SEQUENCE = [
    "stage_1_requirement",
    "stage_2_discovery",
    "stage_3_decision",
    "stage_4_pitch",
    "stage_5_reaction",
    "stage_6_quote",
    "stage_7_resolved",
]


def _clamp(val: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, val))


async def get_scheduled_followup_deal(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> Optional[Contract]:
    """
    Exact two-deal follow-up schedule:
    - Q1 deal offered in Q1
    - Q2 deal offered in Q2
    | Q1 deal | Q2 deal | Q3 Client World | Q4 Client World |
    | Rejected | Rejected | No follow-up; completed | No follow-up; completed |
    | Accepted | Rejected | Follow up Q1 deal | No follow-up; completed |
    | Rejected | Accepted | Follow up Q2 deal | No follow-up; completed |
    | Accepted | Accepted | Follow up Q1 deal | Follow up Q2 deal |
    """
    if quarter < 3:
        return None

    try:
        contracts_res = await db.execute(
            select(Contract).where(Contract.company_id == company.id).order_by(Contract.quarter.asc())
        )
    except Exception:
        return None

    existing_contracts: list[Contract] = []
    scalars_fn = getattr(contracts_res, "scalars", None)
    if callable(scalars_fn):
        try:
            s_res = scalars_fn()
            if hasattr(s_res, "__await__"):
                s_res = await s_res
            all_fn = getattr(s_res, "all", None)
            if callable(all_fn):
                all_res = all_fn()
                if hasattr(all_res, "__await__"):
                    all_res = await all_res
                if isinstance(all_res, (list, tuple)):
                    existing_contracts = [c for c in all_res if isinstance(c, Contract)]
        except Exception:
            pass

    if not existing_contracts:
        one_fn = getattr(contracts_res, "scalar_one_or_none", None)
        if callable(one_fn):
            try:
                c_single = one_fn()
                if hasattr(c_single, "__await__"):
                    c_single = await c_single
                if c_single is not None and isinstance(c_single, Contract):
                    existing_contracts = [c_single]
            except Exception:
                pass

    accepted_statuses = ("closed_won", "accepted", "remediated", "active")
    q1_deal = next((c for c in existing_contracts if c.quarter == 1 and c.status in accepted_statuses), None)
    q2_deal = next((c for c in existing_contracts if c.quarter == 2 and c.status in accepted_statuses), None)

    q1_accepted = q1_deal is not None
    q2_accepted = q2_deal is not None

    if quarter == 3:
        if q1_accepted:
            return q1_deal
        elif q2_accepted:
            return q2_deal
        else:
            return None
    elif quarter >= 4:
        if q1_accepted and q2_accepted:
            return q2_deal
        else:
            return None

    return None


async def check_client_prerequisites(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> Tuple[bool, str]:
    """
    Verifies:
    1. Quarter is 1 or 2 (Q3 and Q4 do not allow new client negotiations).
    2. Finance & Operations, Market, and R&D are complete for the current quarter.
    """
    if quarter > 2:
        return False, f"New client negotiations are restricted to Q1 and Q2. Quarter {quarter} clients are passive."

    # Check Operations
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
            return False, "Finance & Operations must be committed before negotiating with clients."

    # Check Market
    market_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "strategic_marketing",
        )
    )
    if not market_res.scalar_one_or_none():
        return False, "Marketing strategy must be committed before negotiating with clients."

    # Check R&D
    rd_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["rd", "research_development"]),
        )
    )
    if not rd_res.scalar_one_or_none():
        return False, "Research & Development must be committed before negotiating with clients."

    return True, ""


async def get_or_create_negotiation_session(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> Dict[str, Any]:
    """
    Retrieves or initializes the current active client contract for the given quarter.
    Encodes rich negotiation state in the contract model and DecisionLog for idempotency.
    """
    # 0. If quarter > 2: Passive Client Experience with carried forward contracts & SLA Remediation
    if quarter > 2:
        # Check Operations prerequisite
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
                return {
                    "contract_id": "",
                    "quarter": quarter,
                    "scenario": {
                        "id": "locked",
                        "client_name": "Clearance Pending",
                        "client_type": "restricted",
                        "executive_contact": "Security Gateway",
                        "executive_title": "Transit Protocol",
                        "headline": "CLIENT AUDIT ACCESS RESTRICTED",
                        "stage_1_requirement": "Finance & Operations budget must be committed before reviewing enterprise client SLA accounts.",
                        "stage_2_discovery": {
                            "deliverables": "Clearance Required",
                            "timeline": "TBD",
                            "constraints": "Complete HQ Operations first",
                            "budget_expectation": 0,
                            "budget_range_text": "N/A",
                            "personality_notes": "Operations pending",
                        },
                        "target_metrics": [],
                        "pitch_hints": [],
                    },
                    "status": "LOCKED",
                    "relationship_score": 50.0,
                    "target_value": 0.0,
                    "is_locked": True,
                    "lock_reason": "Finance & Operations budget must be committed before reviewing enterprise client SLA accounts.",
                    "company_capabilities": {
                        "name": company.name,
                        "sector": company.sector,
                        "innovation": 50.0,
                        "brand": 50.0,
                        "risk": 20.0,
                        "unique_strength": company.unique_strength,
                    },
                }

        contracts_res = await db.execute(
            select(Contract).where(Contract.company_id == company.id).order_by(Contract.quarter.asc())
        )
        existing_contracts = contracts_res.scalars().all()

        logs_res = await db.execute(
            select(DecisionLog).where(
                DecisionLog.company_id == company.id,
                DecisionLog.decision_type.in_(["client_negotiation", "client_remediation", "client_deal"]),
            ).order_by(DecisionLog.quarter.asc())
        )
        all_client_logs = logs_res.scalars().all()
        client_logs = {l.quarter: l for l in all_client_logs}

        # Check if Q3 client remediation is already settled
        q_settled_log = next((l for l in all_client_logs if l.quarter == quarter), None)
        remediation_settled = q_settled_log is not None

        active_portfolio = []
        total_contract_value = 0.0
        total_ongoing_rev = 0.0

        for c in existing_contracts:
            val = float(c.value)
            rel = float(c.relationship_score)
            is_won = c.status == "closed_won"
            if is_won:
                total_contract_value += val
                ongoing_rev = round(val * 0.15, 2)
                total_ongoing_rev += ongoing_rev
            else:
                ongoing_rev = 0.0

            log_entry = client_logs.get(c.quarter)
            summary = log_entry.summary if log_entry else f"Contract in Quarter {c.quarter} ({c.status.replace('_', ' ').upper()})"

            obligation = (
                "Active Multi-Quarter SLA // Dedicated Enterprise Account Support"
                if is_won
                else "Negotiations Concluded // No Active Commitments"
            )
            dispute = (
                "NOMINAL // NO ACTIVE BREACH"
                if rel >= 50
                else ("AUDIT SCRUTINY // ESCALATION RISK" if rel >= 35 else "FORMAL CONTRACT DISPUTE // LEGAL REVIEW")
            )

            active_portfolio.append({
                "id": str(c.id),
                "quarter_signed": c.quarter,
                "client_name": c.client_name,
                "client_type": c.client_type,
                "status": c.status,
                "value": val,
                "relationship_score": rel,
                "ongoing_quarterly_revenue": ongoing_rev,
                "obligation": obligation,
                "dispute_status": dispute,
                "deliverable_status": "ACTIVE_FULFILLMENT" if is_won else "CLOSED",
                "summary": summary,
            })

        avg_rel = (
            sum(c["relationship_score"] for c in active_portfolio) / len(active_portfolio)
            if active_portfolio
            else 50.0
        )

        # Determine target deal using exact two-deal schedule table:
        target_deal = await get_scheduled_followup_deal(db, company, quarter)
        if target_deal is None and quarter >= 4:
            # Fallback for Q4: if player has any active deal or existing contract, use it for remediation
            target_deal = next((c for c in existing_contracts if c.status == "closed_won"), None)
            if not target_deal and existing_contracts:
                target_deal = existing_contracts[0]
            if not target_deal:
                # Create an emergency SLA contract so Q4 remediation is always available
                target_deal = Contract(
                    company_id=company.id,
                    quarter=quarter,
                    client_name="Global Enterprise Client",
                    client_type="Enterprise",
                    status="closed_won",
                    value=35000.0,
                    relationship_score=40.0,
                )
                db.add(target_deal)
                await db.flush()

        if target_deal is None:
            return {
                "contract_id": "",
                "quarter": quarter,
                "has_followup": False,
                "status": "COMPLETED",
                "is_locked": True,
                "lock_reason": None,
                "message": f"No pending client follow-up for Quarter {quarter}.",
                "scenario": None,
                "remediation": None,
                "active_portfolio": active_portfolio,
                "total_active_contracts": len([c for c in active_portfolio if c["status"] == "closed_won"]),
                "total_contract_value": total_contract_value,
                "total_ongoing_quarterly_revenue": total_ongoing_rev,
                "company_capabilities": {
                    "name": company.name,
                    "sector": company.sector,
                    "innovation": 50.0,
                    "brand": 50.0,
                    "risk": 20.0,
                    "unique_strength": company.unique_strength,
                },
            }

        client_name = target_deal.client_name
        client_type = target_deal.client_type
        contract_val = float(target_deal.value) if float(target_deal.value) > 0 else 30000.0
        contract_id = str(target_deal.id)

        base_compensation = max(5000.0, round(contract_val * 0.20, -2))
        max_compensation = round(base_compensation * 2.0, -2)

        audit_feedback = (
            f"Our executive procurement audit board at {client_name} reviewed the Q{target_deal.quarter} contract deliverables. "
            f"While systems are operational, our technical oversight desk flagged SLA delivery latency. "
            f"We formally require an executive operational status response from the CEO (under 50 words) and an SLA remediation compensation rebate."
        )

        settled_deltas = (
            {k: float(v) for k, v in q_settled_log.stat_deltas.items() if isinstance(v, (int, float))}
            if (q_settled_log and isinstance(q_settled_log.stat_deltas, dict))
            else None
        )

        remediation_payload = {
            "contract_id": contract_id,
            "client_name": client_name,
            "client_type": client_type,
            "contract_value": contract_val,
            "quarter_signed": target_deal.quarter,
            "base_amount": base_compensation,
            "max_amount": max_compensation,
            "audit_feedback": audit_feedback,
            "settled": remediation_settled,
            "summary": q_settled_log.summary if q_settled_log else None,
            "stat_deltas": settled_deltas,
            "compensation_paid": (
                float(q_settled_log.stat_deltas.get("compensation_paid", 0.0))
                if (q_settled_log and isinstance(q_settled_log.stat_deltas, dict))
                else 0.0
            ),
        }

        return {
            "contract_id": contract_id,
            "quarter": quarter,
            "has_followup": True,
            "scenario": {
                "id": f"followup_q{quarter}",
                "client_name": client_name.upper(),
                "client_type": f"{client_type} (Q{target_deal.quarter} Retention)",
                "executive_contact": "Strategic Accounts Directorate",
                "executive_title": "Head of Strategic Accounts & SLA Compliance",
                "headline": f"QUARTER 0{quarter} ENTERPRISE CLIENT AUDIT & SLA REMEDIATION",
                "stage_1_requirement": (
                    f"Reviewing active contract deliverables for {client_name} (agreed in Quarter {target_deal.quarter}). "
                    f"Provide an authoritative executive explanation (50 words max) to settle the account."
                ),
                "stage_2_discovery": {
                    "deliverables": "SLA Fulfillment & Compliance Remediation",
                    "timeline": f"Quarter {quarter} Review Cycle",
                    "constraints": f"Compensation floor: ₹{base_compensation:,.0f} minimum",
                    "budget_expectation": total_ongoing_rev,
                    "budget_range_text": f"₹{total_ongoing_rev:,.0f} Ongoing Revenue",
                    "personality_notes": "Demands accountability and SLA restitution",
                },
                "target_metrics": [],
                "pitch_hints": [],
            },
            "status": "COMPLETED" if remediation_settled else "PASSIVE_PORTFOLIO",
            "relationship_score": float(target_deal.relationship_score),
            "target_value": contract_val,
            "is_locked": remediation_settled,
            "lock_reason": "Quarterly client review and SLA compensation have already been finalized." if remediation_settled else None,
            "active_portfolio": active_portfolio,
            "total_active_contracts": len([c for c in active_portfolio if c["status"] == "closed_won"]),
            "total_contract_value": total_contract_value,
            "total_ongoing_quarterly_revenue": total_ongoing_rev,
            "decision_summary": q_settled_log.summary if q_settled_log else None,
            "decision_stat_deltas": settled_deltas,
            "remediation": remediation_payload,
            "company_capabilities": {
                "name": company.name,
                "sector": company.sector,
                "innovation": 50.0,
                "brand": 50.0,
                "risk": 20.0,
                "unique_strength": company.unique_strength,
            },
        }

    # 0. Check prerequisites for Q1/Q2
    can_access, lock_reason = await check_client_prerequisites(db, company, quarter)
    if not can_access:
        return {
            "contract_id": "",
            "quarter": quarter,
            "scenario": {
                "id": "locked",
                "client_name": "Clearance Pending",
                "client_type": "restricted",
                "executive_contact": "Security Gateway",
                "executive_title": "Transit Protocol",
                "headline": "CLIENT OFFICE ACCESS RESTRICTED",
                "stage_1_requirement": lock_reason,
                "stage_2_discovery": {
                    "deliverables": "Clearance Required",
                    "timeline": "TBD",
                    "constraints": "Complete Stage A HQ activities first",
                    "budget_expectation": 0.0,
                    "budget_range_text": "Locked",
                    "personality_notes": "Awaiting authorization",
                },
                "target_metrics": [],
                "pitch_hints": [],
            },
            "status": "LOCKED",
            "relationship_score": 50.0,
            "target_value": 0.0,
            "is_locked": True,
            "lock_reason": lock_reason,
            "decision_summary": None,
            "decision_stat_deltas": None,
            "company_capabilities": {
                "name": company.name,
                "sector": company.sector,
                "innovation": 50.0,
                "brand": 50.0,
                "risk": 20.0,
                "unique_strength": company.unique_strength,
            },
        }

    # Look for existing contract for this company & quarter
    contract_res = await db.execute(
        select(Contract).where(Contract.company_id == company.id, Contract.quarter == quarter)
    )
    contract = contract_res.scalar_one_or_none()

    scenario = get_scenario_for_company(
        company_id_int=company.id.int,
        quarter=quarter,
        company_name=company.name,
        sector=company.sector,
    )

    if contract is None:
        # Create initial contract matching scenario
        contract = Contract(
            company_id=company.id,
            quarter=quarter,
            client_name=scenario["client_name"],
            client_type=scenario["client_type"],
            status="stage_1_requirement",
            value=scenario["stage_2_discovery"]["budget_expectation"],
            relationship_score=50.0,
        )
        db.add(contract)
        await db.commit()
        await db.refresh(contract)
    elif contract.status in ("stage_1_requirement", "incoming", "stage_2_discovery", "stage_4_pitch"):
        # If still in negotiation and client_name doesn't match new sector-aware scenario, align contract client details
        if contract.client_name != scenario["client_name"]:
            contract.client_name = scenario["client_name"]
            contract.client_type = scenario["client_type"]
            contract.value = scenario["stage_2_discovery"]["budget_expectation"]
            await db.commit()
            await db.refresh(contract)

    # Fetch current company state for capability context
    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_res.scalar_one_or_none()

    # Check if a deal decision was already finalized this quarter
    decision_log_res = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["client_negotiation", "client_deal"]),
        )
    )
    decision_log = decision_log_res.scalar_one_or_none()
    is_locked = decision_log is not None or contract.status in ("closed_won", "closed_lost")

    return {
        "contract_id": str(contract.id),
        "quarter": quarter,
        "scenario": scenario,
        "status": contract.status,
        "relationship_score": float(contract.relationship_score),
        "target_value": float(contract.value),
        "is_locked": is_locked,
        "decision_summary": decision_log.summary if decision_log else None,
        "decision_stat_deltas": decision_log.stat_deltas if decision_log else None,
        "company_capabilities": {
            "name": company.name,
            "sector": company.sector,
            "innovation": float(state.innovation) if state else 50.0,
            "brand": float(state.brand) if state else 50.0,
            "risk": float(state.risk) if state else 20.0,
            "unique_strength": company.unique_strength,
        },
    }


async def advance_discovery(
    db: AsyncSession,
    company: Company,
    contract_id: str,
    action: str,  # "tell_me_more" or "decline"
) -> Dict[str, Any]:
    """Handles Stage 1 -> Stage 2 progression or early decline."""
    contract_res = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = contract_res.scalar_one_or_none()
    if not contract or contract.company_id != company.id:
        raise ValueError("Contract not found.")

    if contract.status not in ("stage_1_requirement", "incoming"):
        if contract.status in ("closed_won", "closed_lost"):
            raise ValueError("This contract negotiation is already resolved.")
        # If already advanced, return current status idempotently
        return {"status": contract.status, "relationship_score": float(contract.relationship_score)}

    if action == "tell_me_more":
        contract.status = "stage_2_discovery"
        # Small engagement boost
        contract.relationship_score = min(100.0, float(contract.relationship_score) + 2.0)
    elif action == "decline":
        contract.status = "closed_lost"
        # Record early decline
        db.add(
            DecisionLog(
                company_id=company.id,
                quarter=contract.quarter,
                decision_type="client_negotiation",
                reference_id=contract.id,
                summary=f"Declined initial requirement inquiry from {contract.client_name}.",
                stat_deltas={"market_share": -0.1},
            )
        )
    else:
        raise ValueError(f"Invalid discovery action: {action}")

    await db.commit()
    await db.refresh(contract)
    return {"status": contract.status, "relationship_score": float(contract.relationship_score)}


async def handle_pursue_or_reject(
    db: AsyncSession,
    company: Company,
    contract_id: str,
    action: str,  # "pursue" or "reject"
) -> Dict[str, Any]:
    """Handles Stage 2 / Stage 3 -> Stage 4 (Pitch) or rejection."""
    contract_res = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = contract_res.scalar_one_or_none()
    if not contract or contract.company_id != company.id:
        raise ValueError("Contract not found.")

    if contract.status in ("closed_won", "closed_lost"):
        raise ValueError("This contract negotiation is already resolved.")

    if action == "pursue":
        contract.status = "stage_4_pitch"
        contract.relationship_score = min(100.0, float(contract.relationship_score) + 3.0)
    elif action == "reject":
        contract.status = "closed_lost"
        db.add(
            DecisionLog(
                company_id=company.id,
                quarter=contract.quarter,
                decision_type="client_negotiation",
                reference_id=contract.id,
                summary=f"Rejected proposal after discovery with {contract.client_name}.",
                stat_deltas={"market_share": -0.15},
            )
        )
    else:
        raise ValueError(f"Invalid pursue action: {action}")

    await db.commit()
    await db.refresh(contract)
    return {"status": contract.status, "relationship_score": float(contract.relationship_score)}


async def submit_pitch_evaluation(
    db: AsyncSession,
    company: Company,
    contract_id: str,
    pitch_text: str,
    groq_caller=None,
    gemini_caller=None,
) -> Dict[str, Any]:
    """
    Stage 4 -> Stage 5:
    Calls LLM Pitch Evaluation (Groq with immediate Gemini fallback),
    persists trust adjustments to contract, and returns structured reaction.
    """
    clean_pitch = pitch_text.strip()
    if len(clean_pitch) < 3:
        raise ValueError("Pitch text must contain meaningful content.")
    if len(clean_pitch) > 1500:
        clean_pitch = clean_pitch[:1500]

    contract_res = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = contract_res.scalar_one_or_none()
    if not contract or contract.company_id != company.id:
        raise ValueError("Contract not found.")

    if contract.status in ("closed_won", "closed_lost"):
        raise ValueError("This contract negotiation is already resolved.")

    # Retrieve scenario and company state
    scenario = get_scenario_for_company(
        company_id_int=company.id.int,
        quarter=contract.quarter,
        company_name=company.name,
        sector=company.sector,
    )

    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == contract.quarter,
        )
    )
    state = state_res.scalar_one_or_none()

    client_info = {
        "client_name": contract.client_name,
        "client_type": contract.client_type,
        "requirement": scenario["stage_1_requirement"],
        "deliverables": scenario["stage_2_discovery"]["deliverables"],
        "timeline": scenario["stage_2_discovery"]["timeline"],
        "budget": scenario["stage_2_discovery"]["budget_expectation"],
    }
    company_info = {
        "company_name": company.name,
        "sector": company.sector,
        "innovation": float(state.innovation) if state else 50.0,
        "brand": float(state.brand) if state else 50.0,
        "risk": float(state.risk) if state else 20.0,
        "unique_strength": company.unique_strength,
    }

    # Execute LLM evaluation
    assessment = await evaluate_client_pitch(
        pitch=clean_pitch,
        client_info=client_info,
        company_info=company_info,
        groq_caller=groq_caller,
        gemini_caller=gemini_caller,
    )

    # Update contract trust/relationship score
    new_rel = _clamp(float(contract.relationship_score) + assessment["trust_delta"], 10.0, 100.0)
    contract.relationship_score = new_rel
    contract.status = "stage_5_reaction"

    await db.commit()
    await db.refresh(contract)

    return {
        "status": contract.status,
        "score": assessment["score"],
        "client_reaction": assessment["client_reaction"],
        "trust_delta": assessment["trust_delta"],
        "new_relationship_score": new_rel,
        "suggested_price_multiplier": assessment["suggested_price_multiplier"],
        "provider": assessment["provider"],
        "latency_ms": assessment.get("latency_ms", 0),
    }


def resolve_commercial_deal(
    quoted_price: float,
    budget_expectation: float,
    pitch_score: int,
    relationship_score: float,
    company_capabilities: Dict[str, float],
) -> Tuple[str, float, str, Dict[str, float]]:
    """
    Deterministic Game Engine Resolution Algorithm.
    Computes deal outcome:
    - 'ACCEPTED': Price within acceptable threshold given pitch quality & trust.
    - 'COUNTEROFFER': Price exceeds comfort ceiling but pitch/trust high enough to negotiate.
    - 'REJECTED': Price too exorbitant or pitch/trust too substandard.
    - 'WALKED_AWAY': Severe price gouging or catastrophic lack of trust.
    """
    ratio = quoted_price / budget_expectation if budget_expectation > 0 else 1.0

    # Severe price gouging (> 2.0x budget) immediately walks away
    if ratio >= 2.0:
        outcome = "WALKED_AWAY"
        final_revenue = 0.0
        stat_deltas = {
            "client_satisfaction": -4.0,
            "market_share": -0.2,
        }
        explanation = (
            f"Negotiations stalled. Quoting ₹{quoted_price:,.0f} against an expected "
            f"budget of ₹{budget_expectation:,.0f} was deemed excessively over-budget."
        )
        return outcome, final_revenue, explanation, stat_deltas

    # Generous educational evaluation:
    # Sub-50 score only occurs on empty / gibberish text
    if pitch_score < 50:
        outcome = "REJECTED"
        final_revenue = 0.0
        stat_deltas = {
            "client_satisfaction": -2.0,
            "market_share": -0.1,
        }
        explanation = (
            f"The client politely declined: \"We'll take our business elsewhere for now.\" "
            f"Your pitch (Score: {pitch_score}/100) was too brief to approve this quarter."
        )
        return outcome, final_revenue, explanation, stat_deltas

    # Pitch score >= 50: Considered a passing pitch!
    # Generous acceptable price ratio: from 0.95x up to 1.35x
    brand = company_capabilities.get("brand", 50.0)
    commercial_leverage = (pitch_score * 0.60) + (relationship_score * 0.25) + (brand * 0.15)
    max_acceptable_ratio = 1.05 + (commercial_leverage / 100.0) * 0.25
    counteroffer_ceiling = max_acceptable_ratio + 0.35

    if ratio <= max_acceptable_ratio:
        outcome = "ACCEPTED"
        final_revenue = quoted_price
        sat_boost = min(12.0, max(4.0, (commercial_leverage / 10.0) - (ratio * 2.0)))
        stat_deltas = {
            "revenue": round(final_revenue, 2),
            "cash": round(final_revenue * 0.85, 2),
            "client_satisfaction": round(sat_boost, 2),
            "market_share": round(0.5 + (final_revenue / 40000.0), 2),
        }
        explanation = (
            f"Deal accepted at quoted price of ₹{quoted_price:,.0f}! The client executive approved your proposal with confidence, "
            f"commending your clear approach and competitive terms."
        )
    elif ratio <= counteroffer_ceiling:
        outcome = "COUNTEROFFER"
        compromise_price = round(budget_expectation * 1.05, 2)
        final_revenue = compromise_price
        stat_deltas = {
            "revenue": round(final_revenue, 2),
            "cash": round(final_revenue * 0.85, 2),
            "client_satisfaction": 3.0,
            "market_share": 0.3,
        }
        explanation = (
            f"The client was impressed by your pitch! However, ₹{quoted_price:,.0f} slightly exceeded their allocated budget. "
            f"They offered an approved compromise of ₹{compromise_price:,.0f} to lock in the partnership."
        )
    elif ratio >= 2.0:
        outcome = "WALKED_AWAY"
        final_revenue = 0.0
        stat_deltas = {
            "client_satisfaction": -4.0,
            "market_share": -0.2,
        }
        explanation = (
            f"Negotiations stalled. Quoting ₹{quoted_price:,.0f} against an expected "
            f"budget of ₹{budget_expectation:,.0f} was deemed excessively over-budget."
        )
    else:
        outcome = "REJECTED"
        final_revenue = 0.0
        stat_deltas = {
            "client_satisfaction": -1.5,
            "market_share": -0.1,
        }
        explanation = (
            f"The client was constrained by procurement ceilings at ₹{quoted_price:,.0f} and opted to hold for next quarter."
        )

    return outcome, final_revenue, explanation, stat_deltas


async def submit_price_quote_and_resolve(
    db: AsyncSession,
    company: Company,
    contract_id: str,
    quoted_price: float,
    pitch_score: int = 60,
) -> Dict[str, Any]:
    """
    Stage 6 -> Stage 7:
    Authoritative deterministic resolution and persistence of deal outcome, revenue,
    client satisfaction, and DecisionLog record.
    """
    if quoted_price <= 0:
        raise ValueError("Quoted price must be greater than zero.")
    if math.isnan(quoted_price) or math.isinf(quoted_price):
        raise ValueError("Invalid quoted price amount.")

    contract_res = await db.execute(select(Contract).where(Contract.id == contract_id))
    contract = contract_res.scalar_one_or_none()
    if not contract or contract.company_id != company.id:
        raise ValueError("Contract not found.")

    if contract.status in ("closed_won", "closed_lost"):
        raise ValueError("This contract negotiation has already been resolved.")

    # Retrieve scenario and state
    scenario = get_scenario_for_company(
        company_id_int=company.id.int,
        quarter=contract.quarter,
        company_name=company.name,
        sector=company.sector,
    )
    budget = scenario["stage_2_discovery"]["budget_expectation"]

    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == contract.quarter,
        )
    )
    state = state_res.scalar_one_or_none()
    if not state:
        raise ValueError("Company state not found for current quarter.")

    capabilities = {
        "brand": float(state.brand),
        "innovation": float(state.innovation),
        "risk": float(state.risk),
    }

    outcome, final_revenue, explanation, deltas = resolve_commercial_deal(
        quoted_price=quoted_price,
        budget_expectation=budget,
        pitch_score=pitch_score,
        relationship_score=float(contract.relationship_score),
        company_capabilities=capabilities,
    )

    # Persist contract status
    if outcome in ("ACCEPTED", "COUNTEROFFER"):
        contract.status = "closed_won"
        contract.value = final_revenue
        contract.relationship_score = min(100.0, float(contract.relationship_score) + 10.0)
    else:
        contract.status = "closed_lost"
        contract.relationship_score = max(0.0, float(contract.relationship_score) - 10.0)

    # Apply real state deltas through game engine
    state.revenue = float(state.revenue) + deltas.get("revenue", 0.0)
    state.cash = float(state.cash) + deltas.get("cash", 0.0)

    for metric in ["client_satisfaction", "market_share"]:
        if metric in deltas:
            cur = float(getattr(state, metric))
            setattr(state, metric, _clamp(cur + deltas[metric], 0.0, 100.0))

    # Persist DecisionLog
    db.add(
        DecisionLog(
            company_id=company.id,
            quarter=contract.quarter,
            decision_type="client_negotiation",
            reference_id=contract.id,
            summary=f"Commercial deal with {contract.client_name}: {outcome} (Final: ₹{final_revenue:,.0f}).",
            stat_deltas=deltas,
        )
    )

    await db.commit()
    await db.refresh(contract)
    await db.refresh(state)

    return {
        "status": contract.status,
        "outcome": outcome,
        "quoted_price": quoted_price,
        "final_revenue": final_revenue,
        "explanation": explanation,
        "stat_deltas": deltas,
        "new_revenue": float(state.revenue),
        "new_cash": float(state.cash),
        "new_client_satisfaction": float(state.client_satisfaction),
        "new_market_share": float(state.market_share),
    }


async def _evaluate_remediation_response(
    client_name: str,
    contract_val: float,
    issue: str,
    response_text: str,
) -> Dict[str, Any]:
    """
    Evaluates player's written response (<= 50 words) to client follow-up.
    Pipeline: Groq -> Gemini -> Deterministic fallback.
    Returns: quality_score, refund_pct (0.0 to 0.25), reaction, satisfaction_delta, brand_delta, risk_delta
    """
    sys_prompt = (
        "You are an enterprise account director in Corporate Apocalypse 2400.\n"
        f"Client: {client_name}. Contract value: ₹{contract_val:,.0f}.\n"
        f"Issue: {issue}\n"
        "Evaluate the CEO's written response (under 50 words). Respond strictly in JSON format:\n"
        "{\n"
        '  "client_reaction": "concise client response under 30 words",\n'
        '  "quality_score": integer from 0 to 100,\n'
        '  "satisfaction_delta": float from -15.0 to 15.0,\n'
        '  "brand_delta": float from -5.0 to 5.0,\n'
        '  "risk_delta": float from -3.0 to 4.0\n'
        "}"
    )
    user_prompt = f"CEO Statement:\n\"{response_text}\""

    raw = await request_llm_completion(sys_prompt, user_prompt, temperature=0.2, max_tokens=300)
    if raw:
        try:
            cleaned = raw.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            data = json.loads(cleaned)
            score = max(0, min(100, int(data.get("quality_score", 50))))
            sat = max(-20.0, min(12.0, float(data.get("satisfaction_delta", 2.0))))
            brand = max(-8.0, min(4.0, float(data.get("brand_delta", 0.5))))
            risk = max(-3.0, min(6.0, float(data.get("risk_delta", 0.0))))
            return {
                "client_reaction": str(data.get("client_reaction", "Client accepted terms.")),
                "quality_score": score,
                "satisfaction_delta": sat,
                "brand_delta": brand,
                "risk_delta": risk,
                "provider": "llm",
            }
        except Exception:
            pass

    # Deterministic fallback when both Groq and Gemini fail
    clean_words = set(re.findall(r"\w+", response_text.lower()))
    good_keywords = {"remediate", "protocol", "deliver", "commit", "sla", "team", "resolve", "apology", "enhance", "remedy", "assure", "priority", "upgrade", "guarantee", "execute"}
    matches = len(clean_words.intersection(good_keywords))

    if matches >= 3:
        score = 75
        reaction = f"{client_name} director accepted the proactive executive remediation plan."
        sat = 5.0
        brand = 1.5
        risk = -1.0
    elif matches >= 1:
        score = 45
        reaction = f"{client_name} acknowledged the statement with skepticism and approved provisional remediation terms."
        sat = -3.0
        brand = -1.5
        risk = 1.0
    else:
        score = 20
        reaction = f"{client_name} expressed severe dissatisfaction and demanded immediate compensation rebate."
        sat = -12.0
        brand = -5.0
        risk = 4.0

    return {
        "client_reaction": reaction,
        "quality_score": score,
        "satisfaction_delta": sat,
        "brand_delta": brand,
        "risk_delta": risk,
        "provider": "fallback",
    }


async def submit_client_remediation(
    db: AsyncSession,
    company: Company,
    quarter: int,
    contract_id: str,
    compensation_amount: float,
    status_update: str = "",
) -> Dict[str, Any]:
    """
    Q3/Q4 Enterprise Client SLA Audit Review & Compensation Settlement.
    Enforces <= 50 words written response, Groq -> Gemini -> Fallback evaluation,
    authoritative financial deduction, and authoritative bankruptcy flow if insolvent.
    """
    if quarter <= 2:
        raise ValueError("SLA Remediation is only available in Q3 and beyond.")

    # 1. Enforce 50-word maximum limit on backend
    words = len(status_update.strip().split())
    if words > 50:
        raise ValueError(f"Response exceeds maximum limit of 50 words (received {words} words).")
    if words == 0:
        raise ValueError("Written response cannot be empty.")

    if compensation_amount <= 0:
        raise ValueError("Compensation amount must be greater than zero.")
    if math.isnan(compensation_amount) or math.isinf(compensation_amount):
        raise ValueError("Invalid compensation amount.")

    # 2. Check if already settled this quarter (idempotency)
    existing_log = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["client_negotiation", "client_remediation"]),
        )
    )
    existing = existing_log.scalar_one_or_none()
    if existing:
        return {
            "status": "ALREADY_SETTLED",
            "summary": existing.summary,
            "stat_deltas": existing.stat_deltas,
        }

    # 3. Check state
    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_res.scalar_one_or_none()
    if not state:
        raise ValueError(f"Company state not found for Quarter {quarter}.")

    # 4. Fetch contract for this quarter with robust Q4 support
    contract = None
    if contract_id:
        try:
            cid = uuid.UUID(contract_id) if isinstance(contract_id, str) else contract_id
            c_res = await db.execute(select(Contract).where(Contract.id == cid))
            contract = c_res.scalar_one_or_none()
        except Exception:
            pass
    if not contract:
        contract = await get_scheduled_followup_deal(db, company, quarter)
    if not contract:
        c_res = await db.execute(
            select(Contract).where(Contract.company_id == company.id).order_by(Contract.quarter.desc())
        )
        contract = c_res.scalars().first()
    if not contract:
        contract = Contract(
            company_id=company.id,
            quarter=quarter,
            client_name="Global Enterprise Client",
            client_type="Enterprise",
            status="closed_won",
            value=35000.0,
            relationship_score=40.0,
        )
        db.add(contract)
        await db.flush()

    client_name = contract.client_name
    contract_val = float(contract.value) if float(contract.value) > 0 else 30000.0
    base_amount = max(5000.0, round(contract_val * 0.20, -2))

    if compensation_amount < base_amount:
        raise ValueError(
            f"Compensation amount cannot be lower than the base demand of ₹{base_amount:,.0f}."
        )

    # 5. Evaluate written response through Groq -> Gemini -> Fallback
    eval_res = await _evaluate_remediation_response(
        client_name=client_name,
        contract_val=contract_val,
        issue=f"Q{contract.quarter} deliverable latency and SLA variance review",
        response_text=status_update.strip(),
    )

    eval_score = eval_res["quality_score"]
    eval_sat = eval_res["satisfaction_delta"]
    eval_brand = eval_res["brand_delta"]
    eval_risk = eval_res["risk_delta"]

    # Extra generosity ratio above base
    extra = max(0.0, compensation_amount - base_amount)
    ratio = extra / base_amount if base_amount > 0 else 0.0

    sat_boost = min(18.0, max(-10.0, round(eval_sat + (ratio * 4.0), 2)))
    brand_boost = min(7.0, max(-5.0, round(eval_brand + (ratio * 2.0), 2)))
    risk_reduction = min(6.0, max(-3.0, round(-eval_risk + (ratio * 1.5), 2)))
    esg_boost = 1.0

    session_row = (
        await db.execute(select(SessionModel).where(SessionModel.id == company.session_id))
    ).scalar_one()
    from app.services.solvency_service import enforce_solvency
    solvency = await enforce_solvency(
        db=db,
        session_row=session_row,
        company=company,
        quarter=quarter,
        action_type="client_remediation",
        action_label=f"Client SLA Remediation with {client_name}",
        required_cash=compensation_amount,
        state=state,
    )
    if solvency.is_bankrupt:
        return {
            "status": "BANKRUPT",
            "client_name": client_name,
            "compensation_amount": 0.0,
            "base_amount": base_amount,
            "stat_deltas": {"cash": 0.0, "insolvent": 1.0},
            "summary": f"Insolvency default: SLA compensation of ₹{compensation_amount:,.0f} exceeded available liquid cash of ₹{solvency.available_cash:,.0f}.",
            "new_cash": solvency.available_cash,
            "new_client_satisfaction": float(state.client_satisfaction),
            "new_brand": float(state.brand),
            "new_risk": float(state.risk),
            "bankrupt": True,
            "bankruptcy": True,
            "action_attempted": f"Client SLA Remediation with {client_name}",
            "required_amount": compensation_amount,
            "available_cash": solvency.available_cash,
            "final_score": solvency.final_score,
        }

    # 6. Solvency verified -- deduct compensation and apply updates
    state.cash = float(state.cash) - compensation_amount
    bankrupt = False

    # 7. Apply KPI changes
    state.client_satisfaction = _clamp(float(state.client_satisfaction) + sat_boost, 0.0, 100.0)
    state.brand = _clamp(float(state.brand) + brand_boost, 0.0, 100.0)
    state.risk = _clamp(float(state.risk) - risk_reduction, 0.0, 100.0)
    state.esg = _clamp(float(state.esg) + esg_boost, 0.0, 100.0)
    contract.relationship_score = _clamp(float(contract.relationship_score) + sat_boost, 0.0, 100.0)

    cleaned_update = status_update.strip()
    summary_text = (
        f"SLA Audit Settlement with {client_name}: Paid ₹{compensation_amount:,.0f} rebate "
        f"(Base: ₹{base_amount:,.0f}). CEO Update: \"{cleaned_update[:80]}{'...' if len(cleaned_update) > 80 else ''}\""
    )

    stat_deltas = {
        "cash": -compensation_amount,
        "compensation_paid": compensation_amount,
        "base_amount": base_amount,
        "client_satisfaction": sat_boost,
        "brand": brand_boost,
        "risk": -risk_reduction,
        "esg": esg_boost,
        "client_name": client_name,
        "status_update": cleaned_update,
        "client_reaction": eval_res.get("client_reaction", "Settlement ratified."),
        "quality_score": eval_score,
        "eval_provider": eval_res.get("provider", "fallback"),
        "bankrupt": bankrupt,
    }

    decision_log = DecisionLog(
        company_id=company.id,
        quarter=quarter,
        decision_type="client_remediation",
        reference_id=contract.id,
        summary=summary_text,
        stat_deltas=stat_deltas,
    )
    db.add(decision_log)

    await db.commit()
    await db.refresh(state)
    await db.refresh(contract)

    return {
        "status": "BANKRUPT" if bankrupt else "SETTLED",
        "client_name": client_name,
        "compensation_amount": compensation_amount,
        "base_amount": base_amount,
        "stat_deltas": stat_deltas,
        "summary": summary_text,
        "new_cash": float(state.cash),
        "new_client_satisfaction": float(state.client_satisfaction),
        "new_brand": float(state.brand),
        "new_risk": float(state.risk),
        "bankrupt": bankrupt,
    }

