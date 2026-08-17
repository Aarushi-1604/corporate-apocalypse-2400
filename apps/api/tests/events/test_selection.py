import random

from app.events.models import EventTemplateConfig, ResponseOption
from app.events.selection import pick_event_template


def make_template(title: str, weight: float = 1.0) -> EventTemplateConfig:
    option = ResponseOption(label="A", stat_deltas={"cash": -100}, follow_up_text="ok")
    return EventTemplateConfig(
        category="test", severity="yellow", title=title, body="body", weight=weight,
        response_options=[option], default_response=option,
    )


def test_same_seed_produces_same_pick():
    candidates = [make_template("a"), make_template("b"), make_template("c")]
    rng1 = random.Random(42)
    rng2 = random.Random(42)

    result1 = pick_event_template(candidates, rng1)
    result2 = pick_event_template(candidates, rng2)

    assert result1.title == result2.title


def test_zero_weight_never_selected():
    candidates = [make_template("never", weight=0.0), make_template("always", weight=10.0)]
    rng = random.Random(1)

    for _ in range(50):
        result = pick_event_template(candidates, rng)
        assert result.title == "always"