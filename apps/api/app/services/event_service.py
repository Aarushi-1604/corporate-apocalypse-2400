import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.selection import pick_event_template
from app.models import Company, CompanyState as CompanyStateModel
from app.models import DecisionLog, EventInstance, EventTemplate as EventTemplateModel
from app.schemas.events import ActiveEventOut, ResponseOptionOut

MIN_DELAY_SECONDS = 10
RESPONSE_WINDOW_SECONDS = 45
BOUNDED_METRICS = [
    "innovation", "brand", "client_satisfaction", "employee_satisfaction",
    "investor_confidence", "esg", "risk", "market_share", "board_confidence",
]


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


async def _resolve_expired(db: AsyncSession, instance: EventInstance) -> None:
    template_result = await db.execute(
        select(EventTemplateModel).where(EventTemplateModel.id == instance.template_id)
    )
    template = template_result.scalar_one()
    await _apply_deltas_and_resolve(
        db, instance, template.default_response["stat_deltas"], chosen_option_index=-1
    )


async def _apply_deltas_and_resolve(
    db: AsyncSession, instance: EventInstance, deltas: dict[str, float], chosen_option_index: int
) -> None:
    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == instance.company_id,
            CompanyStateModel.quarter == instance.quarter,
        )
    )
    state = state_result.scalar_one()

    for metric, delta in deltas.items():
        current = getattr(state, metric)
        new_value = float(current) + delta
        if metric in BOUNDED_METRICS:
            new_value = _clamp(new_value)
        setattr(state, metric, new_value)

    instance.resolved = True
    instance.responded_at = datetime.now(timezone.utc)
    instance.chosen_option_index = chosen_option_index

    db.add(
        DecisionLog(
            company_id=instance.company_id, quarter=instance.quarter,
            decision_type="event_response", reference_id=instance.id,
            summary=f"Responded to event {instance.id} with option {chosen_option_index}.",
            stat_deltas=deltas,
        )
    )
    await db.commit()


async def get_active_event(db: AsyncSession, company: Company, quarter: int) -> ActiveEventOut | None:
    result = await db.execute(
        select(EventInstance).join(EventTemplateModel, EventInstance.template_id == EventTemplateModel.id).where(
            EventInstance.company_id == company.id,
            EventInstance.quarter == quarter,
            EventTemplateModel.category.notlike("hr\\_%", escape="\\"),
        )
    )
    instances_this_quarter = result.scalars().all()

    unresolved = [i for i in instances_this_quarter if not i.resolved]
    if unresolved:
        instance = unresolved[0]
        if datetime.now(timezone.utc) >= instance.response_deadline.replace(tzinfo=timezone.utc):
            await _resolve_expired(db, instance)
            return None
        template_result = await db.execute(
            select(EventTemplateModel).where(EventTemplateModel.id == instance.template_id)
        )
        template = template_result.scalar_one()
        return ActiveEventOut(
            event_instance_id=instance.id, category=template.category, severity=template.severity,
            title=template.title, body=template.body,
            response_options=[ResponseOptionOut(label=o["label"]) for o in template.response_options],
            response_deadline=instance.response_deadline,
        )

    if instances_this_quarter:
        # Already had (and resolved) this quarter's one event -- Phase
        # 13 deliberately caps at one event per quarter. Expanding to
        # multiple per quarter is a later-phase content/pacing change.
        return None

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one()
    elapsed = (datetime.now(timezone.utc) - state.recorded_at.replace(tzinfo=timezone.utc)).total_seconds()
    if elapsed < MIN_DELAY_SECONDS:
        return None

    templates_result = await db.execute(
        select(EventTemplateModel).where(EventTemplateModel.min_quarter <= quarter,EventTemplateModel.category.notlike("hr\\_%", escape="\\"))
    )
    candidates = templates_result.scalars().all()
    if not candidates:
        return None

    from app.events.models import EventTemplateConfig

    candidate_configs = [
        EventTemplateConfig(
            category=c.category, severity=c.severity, title=c.title, body=c.body,
            weight=float(c.weight), min_quarter=c.min_quarter,
            response_options=c.response_options, default_response=c.default_response,
        )
        for c in candidates
    ]
    rng = random.Random(company.id.int + quarter)
    chosen_config = pick_event_template(candidate_configs, rng)
    chosen_db = next(c for c in candidates if c.title == chosen_config.title)

    new_instance = EventInstance(
        company_id=company.id, template_id=chosen_db.id, quarter=quarter,
        response_deadline=datetime.now(timezone.utc) + timedelta(seconds=RESPONSE_WINDOW_SECONDS),
    )
    db.add(new_instance)
    await db.commit()
    await db.refresh(new_instance)

    return ActiveEventOut(
        event_instance_id=new_instance.id, category=chosen_db.category, severity=chosen_db.severity,
        title=chosen_db.title, body=chosen_db.body,
        response_options=[ResponseOptionOut(label=o["label"]) for o in chosen_db.response_options],
        response_deadline=new_instance.response_deadline,
    )


async def respond_to_event(
    db: AsyncSession, event_instance_id: uuid.UUID, chosen_option_index: int, company_id: uuid.UUID
) -> tuple[str, dict[str, float], bool]:
    result = await db.execute(select(EventInstance).where(EventInstance.id == event_instance_id))
    instance = result.scalar_one_or_none()
    if instance is None:
        raise ValueError("NOT_FOUND")
    if instance.company_id != company_id:
        raise ValueError("FORBIDDEN")

    if instance.resolved:
        template_result = await db.execute(
            select(EventTemplateModel).where(EventTemplateModel.id == instance.template_id)
        )
        template = template_result.scalar_one()
        text = (
            template.default_response["follow_up_text"]
            if instance.chosen_option_index == -1
            else template.response_options[instance.chosen_option_index]["follow_up_text"]
        )
        return text, {}, True

    template_result = await db.execute(
        select(EventTemplateModel).where(EventTemplateModel.id == instance.template_id)
    )
    template = template_result.scalar_one()

    if not (0 <= chosen_option_index < len(template.response_options)):
        raise ValueError("INVALID_OPTION")

    option = template.response_options[chosen_option_index]
    await _apply_deltas_and_resolve(db, instance, option["stat_deltas"], chosen_option_index)

    return option["follow_up_text"], option["stat_deltas"], False