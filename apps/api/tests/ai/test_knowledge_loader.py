from app.ai.knowledge_loader import parse_concept_text

SAMPLE = """---
domain: finance
title: Test Concept
related_terms: [other_thing]
---

This is the body text of a test concept.
"""


def test_parses_frontmatter_correctly():
    result = parse_concept_text(SAMPLE)
    assert result["domain"] == "finance"
    assert result["title"] == "Test Concept"
    assert result["related_terms"] == ["other_thing"]
    assert result["body"] == "This is the body text of a test concept."


def test_same_content_produces_same_hash():
    result1 = parse_concept_text(SAMPLE)
    result2 = parse_concept_text(SAMPLE)
    assert result1["content_hash"] == result2["content_hash"]


def test_different_body_produces_different_hash():
    changed = SAMPLE.replace("test concept", "a totally different concept")
    result1 = parse_concept_text(SAMPLE)
    result2 = parse_concept_text(changed)
    assert result1["content_hash"] != result2["content_hash"]


def test_missing_related_terms_defaults_to_empty_list():
    no_related = """---
domain: economics
title: No Related
---

Body here.
"""
    result = parse_concept_text(no_related)
    assert result["related_terms"] == []