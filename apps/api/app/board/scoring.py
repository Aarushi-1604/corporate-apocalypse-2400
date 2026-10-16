def clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


STATUTORY_QUORUM_CONFIDENCE_THRESHOLD = 30.0


def resolve_outcome(starting_confidence: float, deltas: list[float]) -> tuple[float, bool]:
    """
    Pure function: given the confidence value at the moment the board
    was triggered, plus every exchange's delta so far, returns
    (clamped_final_confidence, fired). `fired` is computed against the
    statutory 30% board confidence threshold (or raw <= 0) once evaluated.
    """
    raw_total = starting_confidence + sum(deltas)
    if not deltas:
        fired = raw_total <= 0
    else:
        fired = raw_total < STATUTORY_QUORUM_CONFIDENCE_THRESHOLD
    return clamp(raw_total), fired