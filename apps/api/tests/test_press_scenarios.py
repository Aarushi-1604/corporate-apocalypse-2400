import pytest
from app.services.press_scenarios import build_press_crisis_context, get_journalist_for_sector
from app.services.llm_press_service import (
    deterministic_press_followup,
    deterministic_press_final,
    evaluate_press_step_llm,
)


def test_sector_journalist_selection():
    tech_j = get_journalist_for_sector("Technology")
    assert "KAVYA MENON" in tech_j["name"]

    fin_j = get_journalist_for_sector("Financial Services")
    assert "RAHUL DESHMUKH" in fin_j["name"]

    bio_j = get_journalist_for_sector("Healthcare / Biotech")
    assert "ELENA ROZ" in bio_j["name"]


def test_q1_introductory_crisis_context():
    context = build_press_crisis_context(
        company_name="Apex Dynamics",
        sector="Technology",
        quarter=1,
        company_state={"cash": 75000, "revenue": 20000, "brand": 55, "market_share": 6.5},
        decision_logs=[],
    )
    assert context["quarter"] == 1
    assert "DATA SCRAPING" in context["headline"]
    assert "telemetry" in context["opening_question"].lower()
    assert len(context["established_facts"]) >= 3


def test_q2_harder_crisis_informed_by_q1_decisions():
    q1_logs = [
        {"quarter": 1, "decision_type": "budget", "summary": "Committed operations budget ₹12,000"},
        {"quarter": 1, "decision_type": "rd", "summary": "Project Helix: Autonomous Fleet Synthesis"},
        {"quarter": 1, "decision_type": "strategic_marketing", "summary": "Aggressive Price War Blitz"},
    ]
    context = build_press_crisis_context(
        company_name="Apex Dynamics",
        sector="Technology",
        quarter=2,
        company_state={"cash": 55000, "revenue": 30000, "brand": 48, "market_share": 8.0},
        decision_logs=q1_logs,
    )
    assert context["quarter"] == 2
    assert "CRITICAL LEAK" in context["headline"]
    assert any("Price War" in fact for fact in context["established_facts"])
    assert "price war" in context["opening_question"].lower() or "blitz" in context["opening_question"].lower()


def test_deterministic_followup_tone():
    crisis = {"quarter": 1, "headline": "CRISIS"}
    
    # Accountable statement
    res1 = deterministic_press_followup(crisis, 1, "We take responsibility and will investigate every node.")
    assert res1["tone"] == "NEUTRAL"
    assert "independent investigators" in res1["follow_up_question"]

    # Evasive statement
    res2 = deterministic_press_followup(crisis, 1, "No comment on these unsubstantiated rumors.")
    assert res2["tone"] == "SCEPTICAL"
    assert "scripted deflection" in res2["follow_up_question"]


def test_deterministic_final_consequences():
    crisis = {"quarter": 1}
    stmts_good = [
        "We take responsibility and will initiate an immediate audit.",
        "We will compensate affected users and halt unauthorized data flows.",
        "Our leadership commits to total transparency before the next quarter.",
    ]
    res_good = deterministic_press_final(crisis, stmts_good, "Apex Dynamics")
    assert res_good["tone"] == "FAVOURABLE"
    assert res_good["score"] >= 75
    assert len(res_good["commitments"]) >= 1

    stmts_bad = [
        "No comment.",
        "These are false and baseless allegations.",
        "We deny everything.",
    ]
    res_bad = deterministic_press_final(crisis, stmts_bad, "Apex Dynamics")
    assert res_bad["tone"] == "DAMAGING"
    assert res_bad["score"] <= 40
