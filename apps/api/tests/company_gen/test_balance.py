from app.company_gen.balance_check import (
    POWER_SCORE_MAX,
    POWER_SCORE_MIN,
    compute_power_score,
)
from app.company_gen.generator import load_templates


def test_every_template_within_fairness_band():
    templates = load_templates()
    for template in templates:
        score = compute_power_score(template.base_stats)
        assert POWER_SCORE_MIN <= score <= POWER_SCORE_MAX, (
            f"{template.sector} scored {score}, outside fairness band "
            f"[{POWER_SCORE_MIN}, {POWER_SCORE_MAX}] -- rebalance this "
            f"template's base_stats before shipping it."
        )


def test_at_least_eight_templates_exist():
    assert len(load_templates()) >= 8


def test_all_templates_have_unique_ids():
    templates = load_templates()
    ids = [t.id for t in templates]
    assert len(ids) == len(set(ids))