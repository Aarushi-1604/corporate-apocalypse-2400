"""
Sector-Specific Client Templates & Procedural Generation with Faker
Covers all 8 sectors in Corporate Apocalypse 2400:
1. Banking
2. Cybersecurity
3. Renewable Energy
4. Healthcare
5. Logistics
6. Airlines
7. Media
8. Space Mining

Provides rich, sector-tailored client negotiation scenarios with Faker-generated
executive contacts, institutions, titles, and localized mandates.
"""

from typing import Any, Dict, List
import random
from faker import Faker

fake = Faker()

# Sector-specific archetypes for B2B commercial negotiations
SECTOR_CLIENT_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "Banking": [
        {
            "template_id": "banking_liquidity_clearing",
            "client_type": "institutional",
            "org_suffixes": ["Sovereign Reserve Board", "Interbank Clearing Consortium", "Asset Reserve Guild"],
            "title_patterns": ["Chief Risk Officer", "Comptroller General", "Director of Capital Clearing"],
            "headline": "INTERBANK SETTLEMENT & LIQUIDITY CLEARING OVERHAUL",
            "requirement_template": (
                "{client_name} administers high-velocity settlement across 14 municipal and private banking zones. "
                "Recent macro volatility and collateral liquidity friction have spiked failed transfer settlements by 42%. "
                "We urgently require {player_name} to deploy institutional liquidity buffering and real-time ledger settlement rails before Q3 Basel-V stress tests."
            ),
            "deliverables": (
                "Deploy sub-second automated liquidity rebalancing across multi-tier accounts, integrate automated failover clearing relays, "
                "and underwrite an institutional ₹50M emergency clearing corridor."
            ),
            "timeline": "60 financial settlement cycles (prior to Q3 audit cutoff)",
            "constraints": "Strict compliance with Central Monetary Reserve Regulation 108; zero ledger downtime during active market hours.",
            "budget_base": 24000.0,
            "budget_range_text": "₹20,000 – ₹28,000",
            "personality_notes": "Extremely risk-averse institutional financier. Requires verified capital buffers and strict regulatory compliance.",
            "target_metrics": ["revenue", "client_satisfaction", "risk", "market_share"],
            "pitch_hints": [
                "Address automated liquidity buffering algorithms and real-time ledger settlement.",
                "Mention Basel-V regulatory compliance and failover clearing relays.",
                "Highlight your capital stability and zero-tolerance for transaction downtime.",
            ],
        },
        {
            "template_id": "banking_quantum_custody",
            "client_type": "enterprise",
            "org_suffixes": ["Wealth Partners", "Merchant Credit Syndicate", "Securities & Trust Group"],
            "title_patterns": ["Managing Director of Institutional Wealth", "Head of Private Equity", "Executive Vice President of Custody"],
            "headline": "HIGH-YIELD SYNDICATED ASSET MANAGEMENT PROTOCOL",
            "requirement_template": (
                "{client_name} manages sovereign wealth allocations and high-net-worth industrial bond tranches across Lower Kalki. "
                "With currency hyper-fluctuation and municipal default hazards rising, our portfolio risk indices require institutional restructuring. "
                "We need {player_name}'s balance sheet and advisory capabilities to anchor a premier asset syndicate."
            ),
            "deliverables": (
                "Structure a high-yield algorithmic debt tranche, provide custodian reserve backing, "
                "and deliver weekly predictive yield simulations with algorithmic risk guarantees."
            ),
            "timeline": "Immediate phased capital injection over 45 days",
            "constraints": "Strict fiduciary liability indemnification; transparent fee disclosures under New Kalki Commercial Code.",
            "budget_base": 32000.0,
            "budget_range_text": "₹28,000 – ₹36,000",
            "personality_notes": "Demanding elite wealth manager seeking prestige, deep liquidity reserves, and high yields.",
            "target_metrics": ["revenue", "client_satisfaction", "investor_confidence"],
            "pitch_hints": [
                "Propose structured high-yield debt tranches and custodian reserve backing.",
                "Highlight predictive yield simulations and institutional risk hedging.",
                "Acknowledge New Kalki Commercial Code compliance and fiduciary guarantees.",
            ],
        },
        {
            "template_id": "banking_fraud_countermeasures",
            "client_type": "government",
            "org_suffixes": ["Municipal Revenue Bureau", "District Treasury Authority", "Civic Pension Fund"],
            "title_patterns": ["Treasury Inspector General", "Director of Municipal Capital", "Chief Auditor"],
            "headline": "MUNICIPAL TREASURY & ANTI-FRAUD CLEARINGHOUSE",
            "requirement_template": (
                "The {client_name} distributes civic payroll and universal credit disbursements to 3.8 million citizens. "
                "Synthetic identity theft and rogue transaction injections have drained 12% of district pension allocations. "
                "We require an elite tier-1 financial institution like {player_name} to take over payment routing and audit verification."
            ),
            "deliverables": (
                "Migrate municipal disbursement accounts into secured custodian vaults, deploy real-time transaction screening, "
                "and establish insurance-backed reimbursement protocols for citizen accounts."
            ),
            "timeline": "Full system handover within 70 operational days",
            "constraints": "Public fiscal transparency; zero margin for payroll distribution failure.",
            "budget_base": 28000.0,
            "budget_range_text": "₹24,000 – ₹32,000",
            "personality_notes": "Cautious civic bureaucrat under public scrutiny. Demands impeccable integrity and audit trails.",
            "target_metrics": ["revenue", "client_satisfaction", "brand", "esg"],
            "pitch_hints": [
                "Propose secured custodian vault accounts with real-time transaction fraud screening.",
                "Guarantee 100% payroll delivery uptime and insurance-backed reimbursement.",
                "Emphasize public audit transparency and civic trust.",
            ],
        },
    ],
    "Cybersecurity": [
        {
            "template_id": "cyber_perimeter_defense",
            "client_type": "enterprise",
            "org_suffixes": ["Defense Grid Corp", "Apex Data Systems", "Orbital Telecomm"],
            "title_patterns": ["Chief Information Security Officer", "Director of Defensive Intelligence", "VP of Infrastructure Security"],
            "headline": "ENTERPRISE PERIMETER & ZERO-TRUST FORTIFICATION",
            "requirement_template": (
                "{client_name} maintains mission-critical cloud server nodes across the Upper District. "
                "A sophisticated advanced persistent threat (APT) syndicate has breached perimeter firewalls in two sectors. "
                "We require {player_name} to deploy active intrusion countermeasures and quantum-grade key rotation."
            ),
            "deliverables": (
                "Implement zero-trust identity verification across 12,000 endpoints, deploy autonomous intrusion counter-agents, "
                "and conduct red-team threat assessments with real-time breach containment guarantees."
            ),
            "timeline": "45 rapid response days",
            "constraints": "Zero system outages during active trading cycles; strictly air-gapped threat telemetry logs.",
            "budget_base": 26000.0,
            "budget_range_text": "₹22,000 – ₹30,000",
            "personality_notes": "Hardened, no-nonsense security veteran who respects demonstrable encryption architecture over high-level promises.",
            "target_metrics": ["revenue", "client_satisfaction", "risk"],
            "pitch_hints": [
                "Propose zero-trust endpoint authentication across all 12,000 nodes.",
                "Detail autonomous intrusion counter-agents and real-time containment.",
                "Highlight air-gapped threat logs and zero trading downtime.",
            ],
        },
        {
            "template_id": "cyber_critical_infrastructure",
            "client_type": "government",
            "org_suffixes": ["Civil Protection Authority", "District Energy Grid Bureau", "Public Transit Security"],
            "title_patterns": ["Commissioner of Digital Defense", "Chief Threat Coordinator", "Director of Civic Cybernetics"],
            "headline": "MUNICIPAL SCADA SHIELD PROTOCOL",
            "requirement_template": (
                "{client_name} operates core power and transit automated switching networks. "
                "Recent ransomware incursions have attempted to hijack emergency backup generators. "
                "We are tendering a priority defense contract for {player_name} to harden our physical-cyber SCADA gateways."
            ),
            "deliverables": (
                "Deploy hardware-isolated encryption switches, isolate legacy industrial relays, "
                "and maintain round-the-clock Security Operations Center (SOC) incident monitoring."
            ),
            "timeline": "60 days to full municipal rollout",
            "constraints": "Strict adherence to National Defense Grid Protocol 9; absolute zero tolerance for false positive lockouts.",
            "budget_base": 30000.0,
            "budget_range_text": "₹25,000 – ₹35,000",
            "personality_notes": "High-strung civic commissioner desperate to avoid blackout catastrophe.",
            "target_metrics": ["revenue", "client_satisfaction", "brand", "risk"],
            "pitch_hints": [
                "Focus on hardware-isolated SCADA gateways and legacy relay segmentation.",
                "Guarantee 24/7 Security Operations Center monitoring with zero false positive lockouts.",
                "Commit to strict National Defense Grid Protocol 9 compliance.",
            ],
        },
    ],
    "Renewable Energy": [
        {
            "template_id": "energy_fusion_grid",
            "client_type": "enterprise",
            "org_suffixes": ["Heavy Industries", "Foundry Conglomerate", "Metropolitan Transit Authority"],
            "title_patterns": ["VP of Power Distribution", "Chief Sustainability Officer", "Director of Thermal Operations"],
            "headline": "HIGH-CAPACITY CLEAN MICROGRID INTEGRATION",
            "requirement_template": (
                "{client_name} is suffering frequent rolling brownouts due to obsolete fossil-fuel sub-stations. "
                "With carbon tariffs escalating by 40%, we need {player_name} to connect our industrial smelters to clean solar-fusion microgrids."
            ),
            "deliverables": (
                "Install high-density battery energy storage arrays, deploy automated peak-shaving dispatch algorithms, "
                "and contract 250 Megawatts of certified clean base-load power."
            ),
            "timeline": "90 operational days",
            "constraints": "Continuous power delivery during peak manufacturing shifts; strict ESG green-tier certification.",
            "budget_base": 22000.0,
            "budget_range_text": "₹18,000 – ₹26,000",
            "personality_notes": "Cost-conscious operations director seeking guaranteed uptime and ESG regulatory shields.",
            "target_metrics": ["revenue", "client_satisfaction", "esg"],
            "pitch_hints": [
                "Propose high-density battery energy storage arrays with automated peak shaving.",
                "Guarantee 250 MW clean base-load supply without shift interruptions.",
                "Emphasize certified ESG green-tier compliance to eliminate carbon tariffs.",
            ],
        },
    ],
    "Healthcare": [
        {
            "template_id": "health_clinical_telemetry",
            "client_type": "enterprise",
            "org_suffixes": ["Hospital Syndicate", "Biotech Research Foundation", "Regional Health Network"],
            "title_patterns": ["Chief Medical Officer", "Director of Hospital Operations", "Head of Clinical Informatics"],
            "headline": "BIO-TELEMETRY & CRITICAL CARE MONITORS",
            "requirement_template": (
                "{client_name} manages five intensive trauma hospitals treating over 60,000 weekly patients. "
                "Legacy patient telemetry systems are failing to predict acute post-operative respiratory decompensation. "
                "We need {player_name} to supply medical monitoring hardware and clinical neural predictive diagnostics."
            ),
            "deliverables": (
                "Deploy certified bio-sensor telemetry arrays across 1,200 ICU beds, integrate real-time patient status dashboards, "
                "and guarantee 99.999% clinical equipment uptime."
            ),
            "timeline": "60 clinical implementation days",
            "constraints": "Medical device board certification mandatory; strict patient confidentiality safeguards.",
            "budget_base": 25000.0,
            "budget_range_text": "₹21,000 – ₹29,000",
            "personality_notes": "Empathetic but rigorous medical director who places patient outcomes and compliance above all else.",
            "target_metrics": ["revenue", "client_satisfaction", "brand", "esg"],
            "pitch_hints": [
                "Highlight 99.999% medical uptime across 1,200 ICU beds with neural predictive diagnostics.",
                "Confirm medical board certification and patient privacy safeguards.",
                "Detail real-time bedside telemetry and early-warning decompensation alerts.",
            ],
        },
    ],
    "Logistics": [
        {
            "template_id": "logistics_freight_telemetry",
            "client_type": "enterprise",
            "org_suffixes": ["Industrial Group", "Logistics Consortium", "Inter-District Cargo Line"],
            "title_patterns": ["Vice President of Heavy Logistics", "Chief Operating Officer", "Director of Freight Dispatch"],
            "headline": "AUTONOMOUS FREIGHT CORRIDOR DISPATCH",
            "requirement_template": (
                "{client_name} operates automated transit conduits across Lower Kalki. "
                "Recent supply chain gridlocks have increased freight demurrage costs by 35%. "
                "We need an external solutions contractor capable of optimizing our dispatch routing and reducing network latency before regulatory audits."
            ),
            "deliverables": (
                "Deploy real-time telemetry routing algorithms across 48 automated freight corridors, "
                "integrate fallback failover switches, and guarantee 99.4% transit SLA adherence."
            ),
            "timeline": "60 operational days",
            "constraints": "Zero transit corridor shutdowns allowed during active shipping hours; strict enterprise privacy protocols.",
            "budget_base": 18000.0,
            "budget_range_text": "₹15,000 – ₹20,000",
            "personality_notes": "Pragmatic, value-conscious industrialist who respects grounded technical engineering over buzzwords.",
            "target_metrics": ["revenue", "client_satisfaction", "market_share"],
            "pitch_hints": [
                "Specify dynamic routing algorithms across all 48 automated freight corridors.",
                "Guarantee 99.4% transit SLA adherence with automatic failover switches.",
                "Assure zero corridor shutdowns during active operational shipping hours.",
            ],
        },
    ],
    "Airlines": [
        {
            "template_id": "airline_fleet_turnaround",
            "client_type": "international",
            "org_suffixes": ["Air Alliance", "Skyway Logistics", "Intercontinental Aerospace"],
            "title_patterns": ["Director of Flight Operations", "Chief Aviation Logistics Officer", "Head of Terminal Alliances"],
            "headline": "SUB-ORBITAL FLIGHT DISPATCH & CORRIDOR ROUTING",
            "requirement_template": (
                "{client_name} operates commercial atmospheric and stratosphere flight corridors connecting Kalki to offshore megacities. "
                "Turbulence forecasting anomalies and airspace congestion have caused severe departure cascades. "
                "We require {player_name} to overhaul gate turnaround logistics and high-altitude aerodynamic routing."
            ),
            "deliverables": (
                "Implement predictive atmospheric turbulence vector routing, optimize gate turnaround logistics across 16 terminals, "
                "and achieve a 20% reduction in tarmac fuel burn."
            ),
            "timeline": "45 aviation cycles",
            "constraints": "Civil Aviation Authority regulatory sign-off required; strict passenger safety thresholds.",
            "budget_base": 27000.0,
            "budget_range_text": "₹22,000 – ₹31,000",
            "personality_notes": "Demanding aerospace executive who values route efficiency and flawless safety track records.",
            "target_metrics": ["revenue", "client_satisfaction", "market_share"],
            "pitch_hints": [
                "Propose predictive turbulence vector routing for stratospheric flight paths.",
                "Detail ground turnaround optimization across all 16 terminals to cut tarmac fuel burn by 20%.",
                "Assure full compliance with Civil Aviation Authority safety standards.",
            ],
        },
    ],
    "Media": [
        {
            "template_id": "media_broadcast_syndication",
            "client_type": "enterprise",
            "org_suffixes": ["Communications Network", "Entertainment Guild", "Holo-Broadcast Group"],
            "title_patterns": ["Executive Vice President of Content", "Chief Marketing Strategist", "Director of Network Syndication"],
            "headline": "DISTRICT-WIDE IMMERSIVE HOLO-BROADCAST DISTRIBUTION",
            "requirement_template": (
                "{client_name} is launching the seasonal Grand Assembly championship broadcast to 15 million concurrent viewers. "
                "Our legacy streaming nodes lack the bandwidth to distribute multi-angle holographic feeds without latency drops. "
                "We require {player_name} to anchor our high-definition holographic feed distribution and sponsor integration."
            ),
            "deliverables": (
                "Deploy edge-cached holographic streaming nodes across 24 municipal towers, integrate real-time interactive audience polling, "
                "and guarantee zero-buffering broadcast delivery."
            ),
            "timeline": "30 days until tournament kickoff",
            "constraints": "Broadcasting regulations mandate continuous family-tier censorship filters and strict sponsor impression verification.",
            "budget_base": 21000.0,
            "budget_range_text": "₹17,000 – ₹25,000",
            "personality_notes": "Flashy, fast-talking media executive focused entirely on viewer metrics, impressions, and cultural buzz.",
            "target_metrics": ["revenue", "client_satisfaction", "brand"],
            "pitch_hints": [
                "Propose edge-cached holographic streaming nodes across all 24 municipal transmission towers.",
                "Highlight zero-latency, zero-buffering multi-angle video delivery for 15M concurrent viewers.",
                "Confirm automated family-tier content filtering and certified sponsor impression analytics.",
            ],
        },
    ],
    "Space Mining": [
        {
            "template_id": "mining_orbital_smelting",
            "client_type": "enterprise",
            "org_suffixes": ["Orbital Consortium", "Asteroid Resources Group", "Exoplanet Mining Guild"],
            "title_patterns": ["Director of Deep Space Operations", "Chief Orbital Engineer", "VP of Resource Extraction"],
            "headline": "EXTRATERRESTRIAL ORE REFINERY LOGISTICS",
            "requirement_template": (
                "{client_name} operates heavy autonomous extraction harvesters in the Near-Earth Asteroid Belt. "
                "Extreme telemetry latency and radiation degradation have crippled our automated ore-smelting drones. "
                "We need {player_name} to engineer radiation-hardened control modules and rapid orbital transport shuttles."
            ),
            "deliverables": (
                "Deliver 12 radiation-shielded automated guidance hubs, establish high-throughput satellite telemetry uplinks, "
                "and optimize rare-earth platinum group ore yields by 18%."
            ),
            "timeline": "90 operational days",
            "constraints": "Zero tolerance for orbital collision hazards; high-temperature vacuum certification required.",
            "budget_base": 35000.0,
            "budget_range_text": "₹30,000 – ₹42,000",
            "personality_notes": "Hardened deep-space industrialist with deep pockets who expects flawless engineering under brutal space conditions.",
            "target_metrics": ["revenue", "client_satisfaction", "innovation"],
            "pitch_hints": [
                "Detail radiation-hardened control modules capable of withstanding belt cosmic rays.",
                "Explain high-throughput orbital telemetry hubs and rapid transport shuttles.",
                "Commit to rigorous vacuum temperature certification and 18% ore yield increases.",
            ],
        },
    ],
}


def generate_sector_client_scenario(
    company_name: str,
    sector: str,
    company_id_int: int,
    quarter: int,
) -> Dict[str, Any]:
    """
    Deterministically generates a rich, sector-tailored client negotiation scenario.
    Uses seeded Faker to create diverse corporate identities, executive contacts,
    and contextual descriptions while keeping identical calls deterministic for the quarter.
    """
    # Seed RNG and Faker specifically for this company and quarter
    seed = (company_id_int * 7919 + quarter * 104729) & 0xFFFFFFFF
    rng = random.Random(seed)
    local_fake = Faker()
    local_fake.seed_instance(seed)

    # Normalize sector matching (fallback to Banking or Logistics if unknown)
    matched_sector = "Banking"
    for sec_key in SECTOR_CLIENT_TEMPLATES.keys():
        if sec_key.lower() == sector.lower():
            matched_sector = sec_key
            break

    templates = SECTOR_CLIENT_TEMPLATES[matched_sector]
    tmpl = templates[(company_id_int + quarter) % len(templates)]

    # Generate realistic executive contact using Faker
    first_name = local_fake.first_name()
    last_name = local_fake.last_name()
    executive_contact = f"{first_name} {last_name}"

    # Pick or generate client corporate organization name
    company_last = local_fake.last_name()
    suffix = rng.choice(tmpl["org_suffixes"])
    client_name = f"{company_last} {suffix}"

    # Pick executive title
    executive_title = rng.choice(tmpl["title_patterns"])

    # Interpolate company and client names into requirement text
    req_text = tmpl["requirement_template"].format(
        client_name=client_name,
        player_name=company_name,
    )

    # Jitter budget slightly by +/- 5% deterministically
    budget_jitter = 1.0 + rng.uniform(-0.05, 0.05)
    base_budget = round(tmpl["budget_base"] * budget_jitter, -2)

    return {
        "id": f"{tmpl['template_id']}_{quarter}",
        "sector": matched_sector,
        "client_name": client_name,
        "client_type": tmpl["client_type"],
        "executive_contact": executive_contact,
        "executive_title": executive_title,
        "headline": tmpl["headline"],
        "stage_1_requirement": req_text,
        "stage_2_discovery": {
            "deliverables": tmpl["deliverables"],
            "timeline": tmpl["timeline"],
            "constraints": tmpl["constraints"],
            "budget_expectation": float(base_budget),
            "budget_range_text": tmpl["budget_range_text"],
            "personality_notes": tmpl["personality_notes"],
        },
        "target_metrics": tmpl["target_metrics"],
        "pitch_hints": tmpl.get("pitch_hints", []),
    }


def get_scenario_for_company(
    company_id_int: int,
    quarter: int,
    company_name: str = "Our Enterprise",
    sector: str = "Banking",
) -> Dict[str, Any]:
    """Compatibility wrapper that calls generate_sector_client_scenario."""
    return generate_sector_client_scenario(
        company_name=company_name,
        sector=sector,
        company_id_int=company_id_int,
        quarter=quarter,
    )

