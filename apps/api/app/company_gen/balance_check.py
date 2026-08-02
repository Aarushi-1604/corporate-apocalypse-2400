POWER_SCORE_MIN = 270
POWER_SCORE_MAX = 335


def compute_power_score(base_stats: dict[str, float]) -> float:
    """
    Weighted-sum 'starting power' score. Used to keep every sector
    template on roughly equal footing -- no sector should be a
    statistically better starting point than another.

    Weights below were chosen so a deliberately 'average' company
    (cash=80000, employees=60, innovation=50, brand=50, esg=50,
    market_share=15, investor_confidence=55) scores ~305, and every
    authored template in sector_templates.yaml was hand-checked to
    land within [270, 335] of that baseline.
    """
    return (
        base_stats["cash"] / 2000
        + base_stats["employees"] / 2
        + base_stats["innovation"]
        + base_stats["brand"]
        + base_stats["esg"]
        + base_stats["market_share"] * 2
        + base_stats["investor_confidence"]
    )