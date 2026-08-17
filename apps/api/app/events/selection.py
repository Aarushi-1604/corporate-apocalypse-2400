import random

from app.events.models import EventTemplateConfig


def pick_event_template(
    candidates: list[EventTemplateConfig], rng: random.Random
) -> EventTemplateConfig:
    """
    Pure, seed-testable weighted random pick -- same shape as Phase 8's
    generate_company. random.Random.choices() handles the weighting;
    [0] because choices() always returns a list, even for k=1.
    """
    weights = [c.weight for c in candidates]
    return rng.choices(candidates, weights=weights, k=1)[0]