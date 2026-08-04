from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.company_gen.generator import load_templates
from app.models import CompanyTemplate as CompanyTemplateModel


async def ensure_templates_seeded(db: AsyncSession) -> None:
    """
    Idempotent: inserts one company_templates row per YAML template
    ONLY if a row for that sector doesn't already exist. Runs once,
    automatically, on API startup (see main.py's lifespan). This is
    what gives the generator's config-level templates real database
    UUIDs that companies.template_id can point to via foreign key.
    """
    templates = load_templates()

    result = await db.execute(select(CompanyTemplateModel.sector))
    existing_sectors = {row[0] for row in result.all()}

    for template in templates:
        if template.sector in existing_sectors:
            continue
        db.add(
            CompanyTemplateModel(
                sector=template.sector,
                name_pool=template.name_pool,
                backstory_pool=template.backstory_pool,
                base_stats=template.base_stats,
                unique_strength=template.unique_strength,
                unique_weakness=template.unique_weakness,
                unique_passive_ability=template.unique_passive_ability,
            )
        )

    await db.commit()