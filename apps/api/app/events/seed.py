from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.events.loader import load_event_templates
from app.models import EventTemplate as EventTemplateModel


async def ensure_event_templates_seeded(db: AsyncSession) -> None:
    """
    Same idempotent seeding pattern as Phase 9's company template
    seed -- runs safely on every server start, only inserts templates
    whose title isn't already present.
    """
    templates = load_event_templates()

    result = await db.execute(select(EventTemplateModel.title))
    existing_titles = {row[0] for row in result.all()}

    for t in templates:
        if t.title in existing_titles:
            continue
        db.add(
            EventTemplateModel(
                category=t.category,
                severity=t.severity,
                title=t.title,
                body=t.body,
                response_options=[o.model_dump() for o in t.response_options],
                default_response=t.default_response.model_dump(),
                weight=t.weight,
                min_quarter=t.min_quarter,
            )
        )

    await db.commit()