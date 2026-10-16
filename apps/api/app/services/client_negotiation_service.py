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

import math
from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Company, CompanyState as CompanyStateModel, Contract, DecisionLog
from app.services.client_scenarios import get_scenario_for_company
from app.services.llm_negotiation_service import evaluate_client_pitch


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

        # Identify the original client the company worked with
        won_contracts = [c for c in existing_contracts if c.status == "closed_won"]
        if won_contracts:
            primary_contract = won_contracts[-1]
        elif existing_contracts:
            primary_contract = existing_contracts[-1]
        else:
            primary_contract = None

        if primary_contract:
            client_name = primary_contract.client_name
            client_type = primary_contract.client_type
            contract_val = float(primary_contract.value) if float(primary_contract.value) > 0 else 30000.0
            contract_id = str(primary_contract.id)
        else:
            client_name = "Global Freight & Logistics Guild"
            client_type = "Supply Chain & Municipal Transit"
            contract_val = 30000.0
            contract_id = ""

        # Base compensation required (cannot go lower than base, but can go higher)
        base_compensation = max(5000.0, round(contract_val * 0.20, -2))
        max_compensation = round(base_compensation * 3.5, -2)

        audit_feedback = (
            f"Our executive procurement audit board at {client_name} reviewed the Q2/Q3 delivery milestones. "
            f"While your systems are operational, our technical oversight desk recorded delivery latency and SLA variances. "
            f"Before our committee considers extending contract terms or releasing additional enterprise budgets, "
            f"we formally require an executive operational status update and an SLA remediation compensation rebate."
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
            "scenario": {
                "id": f"passive_portfolio_q{quarter}",
                "client_name": client_name.upper(),
                "client_type": f"{client_type} (Q1/Q2 Retention)",
                "executive_contact": "Strategic Accounts Directorate",
                "executive_title": "Head of Strategic Accounts & SLA Compliance",
                "headline": f"QUARTER 0{quarter} ENTERPRISE CLIENT AUDIT & SLA REMEDIATION",
                "stage_1_requirement": (
                    f"New client negotiations are concluded for the fiscal year. Operations in Quarter {quarter} "
                    f"are focused on executing active enterprise SLA deliverables and settling client audit reviews."
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
            "status": "PASSIVE_PORTFOLIO",
            "relationship_score": avg_rel,
            "target_value": total_contract_value,
            "is_locked": remediation_settled,
            "lock_reason": "Quarterly client review and SLA compensation have already been finalized." if remediation_settled else None,
            "active_portfolio": active_portfolio,
            "total_active_contracts": len([c for c in active_portfolio if c["status"] == "closed_won"]),
            "total_contract_value": total_contract_value,
            "total_ongoing_quarterly_revenue": total_ongoing_rev,
            "decision_summary": q_settled_log.summary if q_settled_log else f"Passive client portfolio active with {len([c for c in active_portfolio if c['status'] == 'closed_won'])} accounts.",
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


async def submit_client_remediation(
    db: AsyncSession,
    company: Company,
    quarter: int,
    contract_id: str,
    compensation_amount: float,
    status_update: str = "",
) -> Dict[str, Any]:
    """
    Q3 Enterprise Client SLA Audit Review & Compensation Settlement.
    The original client demands an SLA remediation rebate with a base floor.
    CEO cannot go lower than base, but can go higher.
    Higher compensation scales Client Trust and Brand reputation recovery, and reduces risk.
    """
    if quarter <= 2:
        raise ValueError("SLA Remediation is only available in Q3 and beyond.")

    if compensation_amount <= 0:
        raise ValueError("Compensation amount must be greater than zero.")
    if math.isnan(compensation_amount) or math.isinf(compensation_amount):
        raise ValueError("Invalid compensation amount.")

    # Check if already settled this quarter
    existing_log = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type.in_(["client_negotiation", "client_remediation"]),
        )
    )
    if existing_log.scalar_one_or_none():
        raise ValueError(f"Enterprise client SLA review for Quarter {quarter} has already been settled.")

    # Check state
    state_res = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_res.scalar_one_or_none()
    if not state:
        raise ValueError(f"Company state not found for Quarter {quarter}.")

    # Fetch contract if exists
    contract = None
    if contract_id:
        contract_res = await db.execute(select(Contract).where(Contract.id == contract_id))
        contract = contract_res.scalar_one_or_none()

    client_name = contract.client_name if contract else "Enterprise Account Partners"
    contract_val = float(contract.value) if (contract and float(contract.value) > 0) else 30000.0
    base_amount = max(5000.0, round(contract_val * 0.20, -2))

    if compensation_amount < base_amount:
        raise ValueError(
            f"Compensation amount cannot be lower than the base demand of ₹{base_amount:,.0f}."
        )

    current_cash = float(state.cash)
    if compensation_amount > current_cash:
        raise ValueError(
            f"Insufficient treasury reserves. Company has ₹{current_cash:,.0f}, but ₹{compensation_amount:,.0f} was allocated."
        )

    # Generous scaling above base
    extra = compensation_amount - base_amount
    ratio = extra / base_amount if base_amount > 0 else 0.0

    sat_boost = min(16.0, round(4.0 + (ratio * 5.0), 2))
    brand_boost = min(6.0, round(1.5 + (ratio * 2.0), 2))
    risk_reduction = min(5.0, round(2.0 + (ratio * 1.5), 2))
    esg_boost = 1.0

    stat_deltas = {
        "cash": -compensation_amount,
        "compensation_paid": compensation_amount,
        "base_amount": base_amount,
        "client_satisfaction": sat_boost,
        "brand": brand_boost,
        "risk": -risk_reduction,
        "esg": esg_boost,
        "client_name": client_name,
        "status_update": status_update.strip() if status_update else "",
    }

    # Apply deltas to state
    state.cash = float(state.cash) - compensation_amount
    state.client_satisfaction = _clamp(float(state.client_satisfaction) + sat_boost, 0.0, 100.0)
    state.brand = _clamp(float(state.brand) + brand_boost, 0.0, 100.0)
    state.risk = _clamp(float(state.risk) - risk_reduction, 0.0, 100.0)
    state.esg = _clamp(float(state.esg) + esg_boost, 0.0, 100.0)

    if contract:
        contract.relationship_score = _clamp(float(contract.relationship_score) + sat_boost, 0.0, 100.0)

    cleaned_update = status_update.strip()
    if cleaned_update:
        summary_text = (
            f"SLA Audit Settlement with {client_name}: Paid ₹{compensation_amount:,.0f} rebate "
            f"(Base: ₹{base_amount:,.0f}). CEO Update: \"{cleaned_update[:80]}{'...' if len(cleaned_update) > 80 else ''}\""
        )
    else:
        summary_text = (
            f"SLA Audit Settlement with {client_name}: Paid ₹{compensation_amount:,.0f} restitution rebate "
            f"(Base: ₹{base_amount:,.0f})."
        )

    decision_log = DecisionLog(
        company_id=company.id,
        quarter=quarter,
        decision_type="client_negotiation",
        reference_id=contract.id if contract else None,
        summary=summary_text,
        stat_deltas=stat_deltas,
    )
    db.add(decision_log)

    await db.commit()
    await db.refresh(state)
    if contract:
        await db.refresh(contract)

    return {
        "status": "SETTLED",
        "client_name": client_name,
        "compensation_amount": compensation_amount,
        "base_amount": base_amount,
        "stat_deltas": stat_deltas,
        "summary": summary_text,
        "new_cash": float(state.cash),
        "new_client_satisfaction": float(state.client_satisfaction),
        "new_brand": float(state.brand),
        "new_risk": float(state.risk),
    }

