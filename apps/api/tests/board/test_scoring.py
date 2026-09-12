from app.board.scoring import resolve_outcome


def test_all_positive_answers_survives():
    final, fired = resolve_outcome(35, [8, 8, 8, 6, 6, 6])
    assert fired is False
    assert final == 77


def test_all_worst_answers_fires():
    final, fired = resolve_outcome(35, [-10, -8, -6, -8, -9, -8])
    assert fired is True


def test_exactly_zero_counts_as_fired():
    final, fired = resolve_outcome(20, [-20])
    assert fired is True
    assert final == 0


def test_clamped_display_value_never_negative_even_when_fired():
    final, fired = resolve_outcome(10, [-50])
    assert fired is True
    assert final == 0  # clamped, even though raw total is -40


def test_partial_answers_not_yet_evaluated_dont_fire():
    """Sanity check on the shape callers will use: only sum whatever
    deltas exist so far -- an empty list means 'board just triggered,
    nothing answered yet', which should never itself fire anyone."""
    final, fired = resolve_outcome(35, [])
    assert fired is False
    assert final == 35