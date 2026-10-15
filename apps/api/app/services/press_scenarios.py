"""
Contextual Press Scenarios and Generator for Corporate Apocalypse 2400.
Grounds crises in real persisted company state (sector, cash runway, market share, past DecisionLogs).
- Q1: Introductory crisis specific to the player's sector and early corporate operations.
- Q2: Harder, reactive crisis informed by Q1 decisions (F&O budget, R&D helix, Market dilemma, Client outcome).
"""

from typing import Any, Dict, List, Optional
import uuid


SECTOR_JOURNALISTS = {
    "Technology": {
        "name": "KAVYA MENON",
        "outlet": "THE CORPORATE TIMES // CYBER DIVISION",
        "avatar": "/assets/press-reporter.png",
        "description": "Tenacious investigative tech correspondent known for deconstructing AI and automation PR smoke screens.",
    },
    "Finance": {
        "name": "RAHUL DESHMUKH",
        "outlet": "NEW KALKI FINANCIAL CHRONICLE",
        "avatar": "/assets/press-reporter.png",
        "description": "Senior forensic market analyst tracking liquidity anomalies, debt leverage, and capital flight.",
    },
    "Healthcare": {
        "name": "DR. ELENA ROZ",
        "outlet": "METROPOLITAN BIO-ETHICS MONITOR",
        "avatar": "/assets/press-reporter.png",
        "description": "Aggressive biomedical watchdog interrogating genetic patents, clinical safety, and trial shortcuts.",
    },
    "Manufacturing": {
        "name": "ARJUN SINGHANIA",
        "outlet": "INDUSTRIAL HORIZON GAZETTE",
        "avatar": "/assets/press-reporter.png",
        "description": "Veteran industrial reporter pressing executives on automation layoffs, foundry failures, and supply cartelization.",
    },
    "Energy": {
        "name": "TARA CHEN",
        "outlet": "NEW KALKI POWER & CLIMATE DISPATCH",
        "avatar": "/assets/press-reporter.png",
        "description": "Zero-compromise infrastructure reporter exposing reactor emissions, grid rationing, and blackouts.",
    },
}

DEFAULT_JOURNALIST = {
    "name": "VIKRAMADITYA SEN",
    "outlet": "THE CORPORATE TIMES // INVESTIGATIVE DESK",
    "avatar": "/assets/press-reporter.png",
    "description": "Chief anchor and bureau editor for New Kalki City's premier morning news conglomerate.",
}


def get_journalist_for_sector(sector: Optional[str]) -> Dict[str, str]:
    if not sector:
        return DEFAULT_JOURNALIST
    s = sector.lower()
    if any(k in s for k in ["health", "bio", "pharma", "medical"]):
        return SECTOR_JOURNALISTS["Healthcare"]
    if any(k in s for k in ["tech", "software", "cyber", "ai", "hardware"]):
        return SECTOR_JOURNALISTS["Technology"]
    if any(k in s for k in ["fin", "bank", "capital", "invest"]):
        return SECTOR_JOURNALISTS["Finance"]
    if any(k in s for k in ["manuf", "industr", "robot", "foundry"]):
        return SECTOR_JOURNALISTS["Manufacturing"]
    if any(k in s for k in ["energ", "power", "grid", "reactor"]):
        return SECTOR_JOURNALISTS["Energy"]
    return DEFAULT_JOURNALIST



def build_press_crisis_context(
    company_name: str,
    sector: str,
    quarter: int,
    company_state: Dict[str, Any],
    decision_logs: List[Dict[str, Any]],
    ceo_name: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Builds a crisis dossier grounded in company facts and prior decisions.
    """
    journalist = get_journalist_for_sector(sector)
    cash = float(company_state.get("cash", 0.0))
    revenue = float(company_state.get("revenue", 0.0))
    debt = float(company_state.get("debt", 0.0))
    brand = float(company_state.get("brand", 50.0))
    market_share = float(company_state.get("market_share", 5.0))
    investor_conf = float(company_state.get("investor_confidence", 50.0))

    # Inspect prior decision logs
    budget_log = next((d for d in decision_logs if d.get("decision_type") == "budget"), None)
    rd_log = next((d for d in decision_logs if d.get("decision_type") in ("rd", "research_development")), None)
    market_log = next((d for d in decision_logs if d.get("decision_type") == "strategic_marketing"), None)
    client_log = next((d for d in decision_logs if d.get("decision_type") == "client_negotiation"), None)

    ceo_label = f"Chief Executive Officer: {ceo_name} | " if ceo_name else ""
    established_facts = [
        f"{ceo_label}Company: {company_name} | Sector: {sector}",
        f"Current Treasury Reserves: ₹{cash:,.0f} | Current Revenue: ₹{revenue:,.0f}",
        f"Brand Integrity Rating: {brand:.1f}/100 | Market Presence: {market_share:.1f}%",
    ]

    if quarter == 1:
        # Q1 Introductory Crisis tailored to sector
        if "tech" in sector.lower():
            headline = f"DATA SCRAPING LEAK AT {company_name.upper()} TRIGGERING SECTOR INQUIRY"
            context = (
                f"Whistleblowers from {company_name}'s server operations leaked documents indicating unauthorized "
                f"telemetry collection from over 40,000 corporate workstations in New Kalki Sector 4. Civic watchdogs "
                f"claim personal privacy was systematically bypassed to train internal automation neural pipelines."
            )
            opening_question = (
                f"CEO {company_name}, civic auditors confirm tens of thousands of citizen telemetry logs were routed "
                f"directly into your compute core—did you personally authorize this telemetry harvesting or did your infrastructure fail?"
            )
            established_facts.extend([
                "Auditors discovered unauthorized telemetry feeds from Sector 4 nodes.",
                "Public privacy advocacy groups are assembling outside City Hall demanding statutory sanctions.",
            ])
        elif "fin" in sector.lower():
            headline = f"{company_name.upper()} EXPOSURE IN HIGH-RISK OFFSHORE DERIVATIVES LEAKED"
            context = (
                f"Leaked inter-bank settlement ledgers show {company_name} concentrated a substantial portion of its operating "
                f"margin into unregulated algorithmic liquidity swaps in New Kalki's shadow zone. Analysts question financial solvency."
            )
            opening_question = (
                f"CEO, market analysts just identified high-risk synthetic derivatives on your books—how can you reassure "
                f"investors that your balance sheet is protected against an immediate liquidity freeze?"
            )
            established_facts.extend([
                "Shadow liquidity ledgers uncovered with direct clearing ties to your treasury.",
                "Institutional investors are threatening an emergency margin audit.",
            ])
        elif "bio" in sector.lower() or "health" in sector.lower():
            headline = f"CLINICAL REGULATORY BREACH TIED TO {company_name.upper()} LABS"
            context = (
                f"Municipal Bio-Safety Inspectors issued a provisional stop-work citation to {company_name}'s wet labs, citing "
                f"unlogged genetic synthesis protocols and skipped phase-one decontamination cycles."
            )
            opening_question = (
                f"CEO, bio-safety inspectors have halted work in your primary synthesis laboratory—can you verify to the public "
                f"that no uncontained genetic materials have escaped into the civic water grid?"
            )
            established_facts.extend([
                "Municipal stop-work citation delivered to laboratory operations.",
                "Decontamination log discrepancies flagged by municipal inspectors.",
            ])
        elif "energy" in sector.lower():
            headline = f"GRID SURGE ANOMALY TRACED TO {company_name.upper()} SUBSTATION"
            context = (
                f"A sudden brownout cascaded across New Kalki District 3 last night after {company_name}'s substation drew "
                f"unmetered peak voltage to stabilize private industrial storage units."
            )
            opening_question = (
                f"CEO, District 3 hospitals and municipal clinics suffered rolling blackouts due to your substation draw—why "
                f"did your private infrastructure siphon energy away from emergency civic grids?"
            )
            established_facts.extend([
                "District 3 blackout directly correlated with substation draw peak.",
                "Municipal Energy Board has opened an unmetered draw investigation.",
            ])
        else:
            headline = f"REGULATORY COMPLIANCE SUBPOENA SERVED ON {company_name.upper()}"
            context = (
                f"Municipal enforcement officers raided an offsite data depot linked to {company_name}, seizing supply chain "
                f"manifests and unverified import certifications for primary manufacturing units."
            )
            opening_question = (
                f"CEO, enforcement officers just seized your offsite import logs—how do you account for uncertified component "
                f"shipments clearing through your supply chain?"
            )
            established_facts.extend([
                "Municipal audit team confiscated unverified import manifests.",
                "Subpoena requires CEO accountability before the morning market bell.",
            ])

    else:
        # Q2 Harder, contextual crisis referencing actual Q1 player decisions
        prior_actions = []
        if budget_log:
            prior_actions.append(f"Q1 Budget Decision: {budget_log.get('summary', 'Allocations executed')}")
            established_facts.append(f"Recorded Q1 Operations: {budget_log.get('summary', 'Allocations executed')}")
        if rd_log:
            prior_actions.append(f"Q1 Research Initiative: {rd_log.get('summary', 'R&D program executed')}")
            established_facts.append(f"Recorded R&D Program: {rd_log.get('summary', 'R&D program executed')}")
        if market_log:
            prior_actions.append(f"Q1 Market Strategy: {market_log.get('summary', 'Marketing initiative')}")
            established_facts.append(f"Recorded Marketing Campaign: {market_log.get('summary', 'Marketing initiative')}")
        if client_log:
            prior_actions.append(f"Q1 Enterprise Client: {client_log.get('summary', 'Client contract resolution')}")
            established_facts.append(f"Recorded Client Outcome: {client_log.get('summary', 'Client contract resolution')}")

        headline = f"CRITICAL LEAK EXPOSES {company_name.upper()}'S Q1 STRATEGY FALLOUT"
        
        rd_summary = rd_log.get("summary", "") if rd_log else ""
        market_summary = market_log.get("summary", "") if market_log else ""
        
        context = (
            f"Financial regulators and investigative reporters have connected {company_name}'s recent operational maneuvers—"
            f"specifically your strategic deployments in R&D and commercial contracts—to an unfolding regulatory backlash. "
            f"Critics accuse executive leadership of reckless expansion at the expense of shareholder and civic trust."
        )

        if "price war" in market_summary.lower() or "expansion" in market_summary.lower():
            opening_question = (
                f"CEO, your aggressive Q1 market blitz burned company capital and triggered vicious sector counter-attacks—"
                f"with your treasury at ₹{cash:,.0f}, how do you defend this strategy against allegations of corporate recklessness?"
            )
        elif rd_summary:
            opening_question = (
                f"CEO, documents regarding your recent research directive ({rd_summary}) show major undisclosed safety shortcuts—"
                f"were your investors and the public misled about the operational feasibility of this project?"
            )
        else:
            opening_question = (
                f"CEO {company_name}, your Q1 disclosures fail to reconcile your actual capital burn of ₹{cash:,.0f} "
                f"with projected revenues—what hidden operational costs are you withholding from the press today?"
            )

    return {
        "quarter": quarter,
        "journalist": journalist,
        "headline": headline,
        "context": context,
        "opening_question": opening_question,
        "established_facts": established_facts,
    }
