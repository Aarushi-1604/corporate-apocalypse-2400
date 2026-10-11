import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.deps import get_current_session, get_owned_company
from app.models import (
    Company,
    CompanyState as CompanyStateModel,
    CorporateTimesIssue,
    DecisionLog,
    MarketSnapshot,
    Session as SessionModel,
)
from app.schemas.market import (
    CompetitorOut,
    EvaluateCascadeRequest,
    EvaluateCascadeResponse,
    ExecuteMarketDecisionRequest,
    ExecuteMarketDecisionResponse,
    MarketScenarioOut,
    MarketSnapshotOut,
    MarketViewOut,
    ScenarioCardOut,
    StrategicDilemmaOut,
    DecisionOptionOut,
)
from app.services.market_service import build_news, get_competitors, get_or_create_snapshot
from app.services.market_cascade_service import (
    MARKET_CASCADE_SCENARIOS,
    grade_cascade_prediction,
)
from app.services.market_dilemma_service import (
    MARKETING_STRATEGIC_DILEMMAS,
)

router = APIRouter()


# -----------------------------------------------------------------------------
# 1. Market Training Scenarios & Evaluation
# -----------------------------------------------------------------------------
@router.get("/market/training/scenarios", response_model=list[MarketScenarioOut])
async def get_cascade_scenarios() -> list[MarketScenarioOut]:
    """Returns the 5 deterministic macroeconomic cascade learning scenarios."""
    return [
        MarketScenarioOut(
            id=s["id"],
            title=s["title"],
            code=s["code"],
            shock_name=s["shock_name"],
            shock_value=s["shock_value"],
            shock_description=s["shock_description"],
            cards=[ScenarioCardOut(**c) for c in s["cards"]],
        )
        for s in MARKET_CASCADE_SCENARIOS
    ]


@router.post("/market/training/evaluate", response_model=EvaluateCascadeResponse)
async def evaluate_cascade_order(
    payload: EvaluateCascadeRequest,
) -> EvaluateCascadeResponse:
    """Evaluates player's drag-and-drop prediction using deterministic topological precedence."""
    try:
        result = grade_cascade_prediction(payload.scenario_id, payload.submitted_order)
        return EvaluateCascadeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# -----------------------------------------------------------------------------
# 2. Live Market Intelligence (including player's own company KPIs)
# -----------------------------------------------------------------------------
@router.get("/companies/{company_id}/market", response_model=MarketViewOut)
async def get_market_view(
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> MarketViewOut:
    quarter = session_row.current_quarter
    snapshot = await get_or_create_snapshot(db, session_row.id, quarter)

    prev_result = await db.execute(
        select(MarketSnapshot).where(
            MarketSnapshot.session_id == session_row.id, MarketSnapshot.quarter == quarter - 1
        )
    )
    previous = prev_result.scalar_one_or_none()

    # Retrieve current player state for comparison
    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    current_state = state_result.scalar_one_or_none()

    competitors = await get_competitors(db, company)
    news = build_news(snapshot, previous)

    player_market_share = float(current_state.market_share) if current_state else 10.0
    company_cash = float(current_state.cash) if current_state else 0.0
    company_brand = float(current_state.brand) if current_state else 50.0
    company_debt = float(current_state.debt) if current_state else 0.0

    return MarketViewOut(
        snapshot=MarketSnapshotOut(
            quarter=snapshot.quarter,
            oil_price=float(snapshot.oil_price),
            interest_rate=float(snapshot.interest_rate),
            inflation=float(snapshot.inflation),
            commodity_index=float(snapshot.commodity_index),
            currency_index=float(snapshot.currency_index),
        ),
        competitors=[CompetitorOut(**c) for c in competitors],
        player_market_share=player_market_share,
        company_name=company.name,
        company_cash=company_cash,
        company_brand=company_brand,
        company_debt=company_debt,
        news=news,
    )


# -----------------------------------------------------------------------------
# 3. Strategic Dilemma & Decisions
# -----------------------------------------------------------------------------
@router.get("/companies/{company_id}/market/dilemmas", response_model=list[StrategicDilemmaOut])
async def get_strategic_dilemmas(
    company: Company = Depends(get_owned_company),
) -> list[StrategicDilemmaOut]:
    """Returns available strategic marketing dilemmas."""
    return [
        StrategicDilemmaOut(
            id=d["id"],
            headline=d["headline"],
            context_brief=d["context_brief"],
            options=[DecisionOptionOut(**o) for o in d["options"]],
        )
        for d in MARKETING_STRATEGIC_DILEMMAS
    ]


@router.post(
    "/companies/{company_id}/market/decide",
    response_model=ExecuteMarketDecisionResponse,
)
async def execute_strategic_decision(
    payload: ExecuteMarketDecisionRequest,
    company: Company = Depends(get_owned_company),
    session_row: SessionModel = Depends(get_current_session),
    db: AsyncSession = Depends(get_db),
) -> ExecuteMarketDecisionResponse:
    """
    Applies the strategic decision consequences to real company state,
    persists a record into decision_log, and weaves the event into Corporate Times press.
    """
    quarter = payload.quarter
    if quarter != session_row.current_quarter:
        raise HTTPException(status_code=409, detail="Quarter mismatch -- refresh session.")

    dilemma = next(
        (d for d in MARKETING_STRATEGIC_DILEMMAS if d["id"] == payload.dilemma_id), None
    )
    if not dilemma:
        raise HTTPException(status_code=404, detail="Unknown dilemma ID.")

    option = next((o for o in dilemma["options"] if o["id"] == payload.option_id), None)
    if not option:
        raise HTTPException(status_code=404, detail="Unknown option ID.")

    # 1. Fetch current company state
    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one_or_none()
    if not state:
        raise HTTPException(status_code=404, detail=f"No company state found for quarter {quarter}.")

    cost = option["cost_cash"]
    if float(state.cash) < cost:
        raise HTTPException(status_code=400, detail="Insufficient liquid cash for this strategic offensive.")

    # 2. Check if decision already logged this quarter (Idempotency)
    existing_log = await db.execute(
        select(DecisionLog).where(
            DecisionLog.company_id == company.id,
            DecisionLog.quarter == quarter,
            DecisionLog.decision_type == "strategic_marketing",
        )
    )
    already = existing_log.scalar_one_or_none()
    if already is not None:
        return ExecuteMarketDecisionResponse(
            status="already_committed",
            option_id=payload.option_id,
            option_title=option["title"],
            summary=already.summary,
            cost_cash=0.0,
            stat_deltas=already.stat_deltas if isinstance(already.stat_deltas, dict) else {},
            press_headline=option["press_headline"].format(company=company.name),
            press_body=option["press_body"].format(company=company.name),
            new_cash=float(state.cash),
            new_market_share=float(state.market_share),
            new_brand=float(state.brand),
            new_risk=float(state.risk),
        )

    # 3. Apply state deltas (bounded metrics clamped to 0..100)
    deltas = dict(option["stat_deltas"])
    deltas["cash"] = -cost

    state.cash = float(state.cash) - cost

    for k, v in option["stat_deltas"].items():
        if hasattr(state, k):
            current_val = float(getattr(state, k))
            new_val = current_val + v
            # If bounded metric, clamp between 0 and 100
            if k in [
                "brand", "risk", "market_share", "client_satisfaction",
                "employee_satisfaction", "investor_confidence", "board_confidence", "esg",
            ]:
                new_val = max(0.0, min(100.0, new_val))
            setattr(state, k, new_val)

    # 4. Record into DecisionLog
    press_headline = option["press_headline"].format(company=company.name)
    press_body = option["press_body"].format(company=company.name)

    log_entry = DecisionLog(
        company_id=company.id,
        quarter=quarter,
        decision_type="strategic_marketing",
        summary=f"{option['title']}: {press_headline}",
        stat_deltas=deltas,
    )
    db.add(log_entry)

    # 5. Weave into Corporate Times issue for this quarter if it exists
    issue_result = await db.execute(
        select(CorporateTimesIssue).where(
            CorporateTimesIssue.session_id == session_row.id,
            CorporateTimesIssue.quarter == quarter,
        )
    )
    issue = issue_result.scalar_one_or_none()
    if issue:
        events = list(issue.market_events) if isinstance(issue.market_events, list) else []
        events.append(f"BREAKING: {press_headline} - {press_body}")
        issue.market_events = events

    await db.commit()
    await db.refresh(state)

    return ExecuteMarketDecisionResponse(
        status="committed",
        option_id=option["id"],
        option_title=option["title"],
        summary=option["description"],
        cost_cash=cost,
        stat_deltas=deltas,
        press_headline=press_headline,
        press_body=press_body,
        new_cash=float(state.cash),
        new_market_share=float(state.market_share),
        new_brand=float(state.brand),
        new_risk=float(state.risk),
    )