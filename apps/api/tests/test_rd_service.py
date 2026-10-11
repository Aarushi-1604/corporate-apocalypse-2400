import pytest
from app.services.rd_service import PROJECT_HELIX_SPEC

def test_project_helix_spec():
    assert PROJECT_HELIX_SPEC["id"] == "project_helix"
    assert PROJECT_HELIX_SPEC["cost_cash"] == 25000.0
    options = {opt["id"]: opt for opt in PROJECT_HELIX_SPEC["options"]}
    assert "invest" in options
    assert "decline" in options

    invest = options["invest"]
    assert invest["cost_cash"] == 25000.0
    assert invest["stat_deltas"]["innovation"] == 6.0

    decline = options["decline"]
    assert decline["cost_cash"] == 0.0
    assert decline["stat_deltas"]["innovation"] == 0.0
