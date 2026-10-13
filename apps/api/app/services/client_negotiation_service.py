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


async def get_or_create_negotiation_session(
    db: AsyncSession,
    company: Company,
    quarter: int,
) -> Dict[str, Any]:
    """
    Retrieves or initializes the current active client contract for the given quarter.
    Encodes rich negotiation state in the contract model and DecisionLog for idempotency.
    """
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
