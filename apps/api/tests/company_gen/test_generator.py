from app.company_gen.generator import generate_company, load_templates


def test_same_seed_and_attempt_produces_identical_company():
    templates = load_templates()
    a = generate_company(templates, session_seed=100, attempt_number=1)
    b = generate_company(templates, session_seed=100, attempt_number=1)

    assert a.template_id == b.template_id
    assert a.name == b.name
    assert a.initial_state.cash == b.initial_state.cash


def test_different_attempt_numbers_can_produce_different_companies():
    templates = load_templates()
    seen_template_ids = {
        generate_company(templates, session_seed=100, attempt_number=n).template_id
        for n in range(1, 20)
    }
    assert len(seen_template_ids) > 1


def test_exclude_template_id_is_never_chosen_again():
    templates = load_templates()
    first = generate_company(templates, session_seed=5, attempt_number=1)
    second = generate_company(
        templates,
        session_seed=5,
        attempt_number=1,
        exclude_template_id=first.template_id,
    )
    assert second.template_id != first.template_id


def test_jitter_stays_within_ten_percent_of_base_stats():
    templates = load_templates()
    template = templates[0]

    result = generate_company([template], session_seed=1, attempt_number=1)

    base_cash = template.base_stats["cash"]
    assert base_cash * 0.85 <= result.initial_state.cash <= base_cash * 1.15


def test_generated_company_has_all_narrative_fields_populated():
    templates = load_templates()
    result = generate_company(templates, session_seed=1, attempt_number=1)

    assert result.name
    assert result.backstory
    assert result.sector
    assert result.unique_strength
    assert result.unique_weakness
    assert "[Company]" not in result.backstory