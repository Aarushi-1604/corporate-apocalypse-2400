def clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def calculate_final_score(
    quarterly_states: list[dict], config: dict
) -> dict:
    """
    Pure function -- no DB access. `quarterly_states` is an ordered
    list of dicts, one per recorded company_states row (chronological),
    each with at least: revenue, profit, client_satisfaction,
    employee_satisfaction, innovation, investor_confidence, risk.

    Number of completed quarters is derived directly from how many
    rows exist (row 1 is the starting snapshot, each row after
    represents one completed quarter) -- no branch-specific reasoning
    about *why* the session ended needed here.
    """
    weights = config["weights"]
    scaling = config["scaling"]

    quarters_completed = min(len(quarterly_states) - 1, 4)

    first = quarterly_states[0]
    last = quarterly_states[-1]

    revenue_growth = (
        (last["revenue"] - first["revenue"]) / first["revenue"] if first["revenue"] else 0.0
    )
    revenue_score = clamp(50 + revenue_growth * scaling["revenue_growth_scale"])

    avg_profit = sum(s["profit"] for s in quarterly_states) / len(quarterly_states)
    profit_score = clamp(50 + avg_profit / scaling["profit_score_divisor"])

    avg_satisfaction = sum(
        (s["client_satisfaction"] + s["employee_satisfaction"]) / 2 for s in quarterly_states
    ) / len(quarterly_states)

    innovation_score = clamp(last["innovation"])
    investor_score = clamp(last["investor_confidence"])

    survival_score = (quarters_completed / 4) * 100

    avg_risk = sum(s["risk"] for s in quarterly_states) / len(quarterly_states)

    final_score = clamp(
        weights["revenue"] * revenue_score
        + weights["profit"] * profit_score
        + weights["satisfaction"] * avg_satisfaction
        + weights["innovation"] * innovation_score
        + weights["investor"] * investor_score
        + weights["survival"] * survival_score
        - weights["risk_penalty"] * avg_risk
    )

    return {
        "final_score": final_score,
        "revenue_score": revenue_score,
        "profit_score": profit_score,
        "satisfaction_score": avg_satisfaction,
        "innovation_score": innovation_score,
        "investor_score": investor_score,
        "survival_score": survival_score,
        "risk_penalty": avg_risk,
    }