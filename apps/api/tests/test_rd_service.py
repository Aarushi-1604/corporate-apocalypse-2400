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


def test_sector_rd_spec_generation_and_cash_cap():
    from app.services.rd_templates import build_sector_rd_spec, SECTOR_RD_TEMPLATES

    # 1. Test for all 8 sectors
    sectors = list(SECTOR_RD_TEMPLATES.keys())
    assert len(sectors) == 8

    for sector in sectors:
        spec = build_sector_rd_spec(sector, 80_000.0, seed=123)
        assert spec["name"] != ""
        assert spec["subtitle"] != ""
        assert spec["cost_cash"] > 0
        assert spec["cost_cash"] <= 80_000.0  # cost never exceeds liquid cash
        assert len(spec["options"]) == 2

    # 2. Strict constraint: when liquid cash is low, cost MUST NOT exceed liquid cash
    low_cash_spec = build_sector_rd_spec("Banking", 5_432.0, seed=42)
    assert low_cash_spec["cost_cash"] <= 5_432.0

    zero_cash_spec = build_sector_rd_spec("Cybersecurity", 0.0, seed=42)
    assert zero_cash_spec["cost_cash"] == 0.0

