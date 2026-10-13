import pytest
from app.services.press_service import validate_ceo_statement


def test_validate_empty_statement():
    valid, err = validate_ceo_statement("")
    assert not valid
    assert "empty" in err.lower()


def test_validate_single_sentence_under_50_words():
    stmt = "We take full operational responsibility and have initiated an immediate third-party audit across all nodes."
    valid, err = validate_ceo_statement(stmt)
    assert valid
    assert err == ""


def test_validate_over_50_words():
    stmt = " " .join(["word"] * 51) + "."
    valid, err = validate_ceo_statement(stmt)
    assert not valid
    assert "exceeds limit" in err.lower()


def test_validate_multiple_sentences():
    stmt = "We take full responsibility for the data anomalies. We have also ordered an immediate freeze on all deployment pipelines."
    valid, err = validate_ceo_statement(stmt)
    assert not valid
    assert "one sentence" in err.lower()


def test_validate_multiple_sentences_exclamation_question():
    stmt = "Is the report accurate? We are looking into the matter immediately."
    valid, err = validate_ceo_statement(stmt)
    assert not valid
    assert "one sentence" in err.lower()
