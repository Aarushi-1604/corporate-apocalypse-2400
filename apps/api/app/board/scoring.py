def clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def resolve_outcome(starting_confidence: float, deltas: list[float]) -> tuple[float, bool]:
    """
    Pure function: given the confidence value at the moment the board
    was triggered, plus every exchange's delta so far, returns
    (clamped_final_confidence, fired). `fired` is computed against the
    RAW (pre-clamp) total, not the clamped one -- so a genuinely
    catastrophic set of answers (raw total deep negative) still
    correctly fires the CEO even though the displayed/stored value
    itself never goes below 0.
    """
    raw_total = starting_confidence + sum(deltas)
    fired = raw_total <= 0
    return clamp(raw_total), fired