import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.models import EventTemplateConfig
from app.events.selection import pick_event_template
from app.models import Company, CompanyState as CompanyStateModel
from app.models import EventInstance, EventTemplate as EventTemplateModel
from app.schemas.employees import EmployeeFeedItemOut, EmployeeFeedOut, EmployeeResponseOptionOut

MAX_HR_EVENTS_PER_QUARTER = 2
SPAWN_DELAYS_SECONDS = [45, 90]


async def _maybe_spawn_next(
    db: AsyncSession, company: Company, quarter: int, existing_count: int
) -> None:
    if existing_count >= MAX_HR_EVENTS_PER_QUARTER:
        return

    state_result = await db.execute(
        select(CompanyStateModel).where(
            CompanyStateModel.company_id == company.id,
            CompanyStateModel.quarter == quarter,
        )
    )
    state = state_result.scalar_one()
    elapsed = (
        datetime.now(timezone.utc) - state.recorded_at.replace(tzinfo=timezone.utc)
    ).total_seconds()

    if elapsed < SPAWN_DELAYS_SECONDS[existing_count]:
        return

    used_result = await db.execute(
        select(EventInstance.template_id).where(
            EventInstance.company_id == company.id, EventInstance.quarter == quarter
        )
    )
    used_ids = {row[0] for row in used_result.all()}

    templates_result = await db.execute(
        select(EventTemplateModel).where(EventTemplateModel.category.like("hr\\_%", escape="\\"))
    )
    all_hr = [t for t in templates_result.scalars().all() if t.id not in used_ids]
    if not all_hr:
        return

    candidate_configs = [
        EventTemplateConfig(
            category=t.category, severity=t.severity, title=t.title, body=t.body,
            weight=float(t.weight), min_quarter=t.min_quarter,
            response_options=t.response_options, default_response=t.default_response,
        )
        for t in all_hr
    ]
    rng = random.Random(company.id.int + quarter * 7919 + existing_count)
    chosen_config = pick_event_template(candidate_configs, rng)
    chosen_db = next(t for t in all_hr if t.title == chosen_config.title)

    db.add(
        EventInstance(
            company_id=company.id, template_id=chosen_db.id, quarter=quarter,
            # Deadline is required by the schema but deliberately unused
            # here -- HR items never auto-expire, unlike Breaking News.
            response_deadline=datetime.now(timezone.utc) + timedelta(days=1),
        )
    )
    await db.commit()


async def get_employee_feed(db: AsyncSession, company: Company, quarter: int) -> EmployeeFeedOut:
    result = await db.execute(
        select(EventInstance)
        .join(EventTemplateModel, EventInstance.template_id == EventTemplateModel.id)
        .where(
            EventInstance.company_id == company.id,
            EventInstance.quarter == quarter,
            EventTemplateModel.category.like("hr\\_%", escape="\\"),
        )
    )
    instances = result.scalars().all()

    await _maybe_spawn_next(db, company, quarter, len(instances))

    # Re-fetch after a possible spawn, so a fresh item shows up in the
    # same response rather than requiring an extra poll cycle.
    result = await db.execute(
        select(EventInstance)
        .join(EventTemplateModel, EventInstance.template_id == EventTemplateModel.id)
        .where(
            EventInstance.company_id == company.id,
            EventInstance.quarter == quarter,
            EventTemplateModel.category.like("hr\\_%", escape="\\"),
        )
    )
    instances = result.scalars().all()

    items = []
    for inst in instances:
        template_result = await db.execute(
            select(EventTemplateModel).where(EventTemplateModel.id == inst.template_id)
        )
        template = template_result.scalar_one()

        follow_up_text = None
        if inst.resolved:
            follow_up_text = (
                template.default_response["follow_up_text"]
                if inst.chosen_option_index == -1
                else template.response_options[inst.chosen_option_index]["follow_up_text"]
            )

        items.append(
            EmployeeFeedItemOut(
                event_instance_id=inst.id, title=template.title, body=template.body,
                response_options=[
                    EmployeeResponseOptionOut(label=o["label"]) for o in template.response_options
                ],
                resolved=inst.resolved, follow_up_text=follow_up_text,
            )
        )

    return EmployeeFeedOut(items=items)