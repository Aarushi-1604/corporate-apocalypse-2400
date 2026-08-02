import random
from pathlib import Path

import yaml

from app.company_gen.models import CompanyTemplate, GeneratedCompany
from app.simulation.models import CompanyState, CompanyTraits

CONFIG_PATH = Path(__file__).parent / "config" / "sector_templates.yaml"

_templates_cache: list[CompanyTemplate] | None = None


def load_templates() -> list[CompanyTemplate]:
    """
    Loads and caches all sector templates from YAML. Same
    load-once-reuse pattern as Phase 7's load_impact_config.
    """
    global _templates_cache
    if _templates_cache is None:
        with open(CONFIG_PATH) as f:
            raw = yaml.safe_load(f)
        _templates_cache = [CompanyTemplate(**t) for t in raw["templates"]]
    return _templates_cache


def generate_company(
    templates: list[CompanyTemplate],
    session_seed: int,
    attempt_number: int = 1,
    exclude_template_id: str | None = None,
) -> GeneratedCompany:
    """
    Deterministically generates a company given a seed + attempt
    number -- same (seed, attempt_number) pair always produces the
    exact same company, same reasoning as the simulation engine's
    seeded variance (Phase 7).
    """
    rng = random.Random(session_seed * 1000 + attempt_number)

    candidates = [t for t in templates if t.id != exclude_template_id]
    if not candidates:
        candidates = templates

    chosen = rng.choice(candidates)
    name = rng.choice(chosen.name_pool)
    backstory = rng.choice(chosen.backstory_pool).replace("[Company]", name)

    jittered_stats = {
        key: value * (1 + rng.uniform(-0.10, 0.10))
        for key, value in chosen.base_stats.items()
    }

    initial_state = CompanyState(
        cash=jittered_stats["cash"],
        revenue=jittered_stats["cash"] * 0.5,
        profit=jittered_stats["cash"] * 0.05,
        debt=0.0,
        stock_price=100.0,
        employees=int(jittered_stats["employees"]),
        innovation=jittered_stats["innovation"],
        brand=jittered_stats["brand"],
        client_satisfaction=50.0,
        employee_satisfaction=50.0,
        investor_confidence=jittered_stats["investor_confidence"],
        esg=jittered_stats["esg"],
        risk=20.0,
        market_share=jittered_stats["market_share"],
        board_confidence=70.0,
    )

    traits = CompanyTraits(passive_multipliers=chosen.passive_multipliers)

    return GeneratedCompany(
        template_id=chosen.id,
        sector=chosen.sector,
        name=name,
        backstory=backstory,
        unique_strength=chosen.unique_strength,
        unique_weakness=chosen.unique_weakness,
        unique_passive_ability=chosen.unique_passive_ability,
        initial_state=initial_state,
        traits=traits,
    )