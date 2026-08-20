from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.employees.loader import load_hr_templates
from app.models import EventTemplate as EventTemplateModel


async def ensure_hr_templates_seeded(db: AsyncSession) -> None:
    """Same idempotent insert-if-missing pattern as Phase 13's event
    seeding -- writes into the SAME event_templates table, distinguished
    only by the hr_ category prefix."""
    templates = load_hr_templates()

    result = await db.execute(select(EventTemplateModel.title))
    existing_titles = {row[0] for row in result.all()}

    for t in templates:
        if t.title in existing_titles:
            continue
        db.add(
            EventTemplateModel(
                category=t.category, severity=t.severity, title=t.title, body=t.body,
                response_options=[o.model_dump() for o in t.response_options],
                default_response=t.default_response.model_dump(),
                weight=t.weight, min_quarter=t.min_quarter,
            )
        )
    await db.commit()