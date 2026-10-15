"""
Sector-specific R&D proposals for 2400-era corporate apocalypse.
Generates dynamic, lore-aligned research projects based on the CEO's company sector.
"""

from typing import Any, Dict, List
import random

# Sector-specific R&D project templates.
# Each sector contains multiple themed initiatives.
SECTOR_RD_TEMPLATES: Dict[str, List[Dict[str, Any]]] = {
    "Cybersecurity": [
        {
            "name": "PROJECT OBSIDIAN LATTICE",
            "subtitle": "Autonomous neural firewall & predictive APT counter-intrusion array",
            "cost_ratio": 0.28,
            "briefing": (
                "The R&D security lab proposes deploying the Obsidian Lattice—an autonomous counter-intrusion array "
                "designed to predict corporate espionage vectors before state-grade syndicates breach root nodes. "
                "Funding this pipeline cements our reputation as an unbreachable bastion, but locks substantial liquidity. "
                "Declining preserves current cash reserves for defensive threat monitoring, but risks falling behind rival intrusion suites."
            ),
            "invest_desc": "Deploy Phase 1 capital into Obsidian Lattice quantum nodes and predictive cyber-countermeasures.",
            "invest_tradeoff": "Immediate capital deduction. Drastically fortifies technical moat and board confidence against espionage.",
            "invest_deltas": {"innovation": 7.0, "risk": 2.0, "board_confidence": 2.5},
            "invest_headline": "{company} GREENLIGHTS PROJECT OBSIDIAN LATTICE TO SECURE METROPOLITAN CIPHER GRID",
            "invest_body": "In a decisive cyber-defense mandate, {company} deployed capital into Project Obsidian Lattice, establishing automated counter-intrusion nodes across New Kalki City.",
            "decline_desc": "Shelve Obsidian Lattice to preserve liquid balance sheet reserves for reactive threat monitoring.",
            "decline_tradeoff": "Shields cash cushion, but foregoes preemptive defense and surrenders technological supremacy.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} DEFERS ADVANCED CYBER LATTICE AS TREASURY DISCIPLINE PREVAILS",
            "decline_body": "Leadership at {company} formally rejected capital expenditure for Obsidian Lattice, citing strict liquidity conservation.",
        },
        {
            "name": "PROJECT ZERO-DAY SENTINEL",
            "subtitle": "Heuristic kernel isolation & sub-ether malware interceptor",
            "cost_ratio": 0.25,
            "briefing": (
                "Our cryptographic research wing has designed the Zero-Day Sentinel—a hardware-level kernel interceptor "
                "capable of neutralizing zero-day payloads at the physical layer. "
                "Funding guarantees pioneering cyber patents and institutional prestige, but expends crucial cash reserves. "
                "Declining safeguards liquid capital while relying on conventional firmware patches."
            ),
            "invest_desc": "Authorize hardware fabrication for Zero-Day Sentinel kernel interceptors across all corporate client endpoints.",
            "invest_tradeoff": "Significant liquid cash expenditure. Elevates innovation velocity and brand authority in enterprise defense.",
            "invest_deltas": {"innovation": 8.0, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} LAUNCHES ZERO-DAY SENTINEL HARDWARE DEFENSE INITIATIVE",
            "invest_body": "{company} has authorized aggressive R&D funding for Zero-Day Sentinel, aiming to eliminate firmware exploit vulnerabilities.",
            "decline_desc": "Decline hardware interceptor development to preserve pristine cash buffers.",
            "decline_tradeoff": "Conserves available cash reserves, but leaves architecture exposed to evolving black-hat exploits.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} HOLDS CAPITAL AS ZERO-DAY SENTINEL EXPERIMENT SHELVED",
            "decline_body": "{company} executive committee voted to withhold capital from the Zero-Day Sentinel project to protect working liquidity.",
        },
    ],
    "Renewable Energy": [
        {
            "name": "PROJECT THERMOCORE MATRIX",
            "subtitle": "Fusion-adjacent magnetic confinement grid & plasma surge stabilizer",
            "cost_ratio": 0.28,
            "briefing": (
                "Our energy engineers propose commissioning the Thermocore Matrix—a magnetic containment grid capable of "
                "capturing erratic solar flare discharge and stabilizing metropolitan microgrids during severe brownouts. "
                "Backing this initiative secures an unmatched technological advantage in clean power generation. "
                "Declining keeps reserves intact to maintain existing solar arrays, but leaves high-yield energy dominance unclaimed."
            ),
            "invest_desc": "Commit capital to build and test the Thermocore Matrix magnetic containment coils.",
            "invest_tradeoff": "Substantial immediate cash drain. Major innovation and clean energy leadership gains.",
            "invest_deltas": {"innovation": 7.5, "risk": 2.0, "board_confidence": 2.0},
            "invest_headline": "{company} INITIATES PROJECT THERMOCORE MATRIX TO TAME METROPOLITAN FUSION SURGES",
            "invest_body": "{company} signaled a transformative bet on energy stability today, dedicating millions to the Thermocore Matrix magnetic containment grid.",
            "decline_desc": "Decline Thermocore Matrix to preserve cash reserves for daily grid maintenance.",
            "decline_tradeoff": "Preserves liquid capital, but leaves metropolitan grid dependent on aging legacy solar collectors.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} OPTS OUT OF THERMOCORE EXPANSION TO SHIELD BALANCE SHEET",
            "decline_body": "{company} shelved its ambitious Thermocore Matrix blueprint today, prioritizing treasury protection over experimental fusion grids.",
        },
        {
            "name": "PROJECT SOLVANE FLUX",
            "subtitle": "Deep-atmosphere particulate photovoltaic harvesting arrays",
            "cost_ratio": 0.25,
            "briefing": (
                "The clean tech division has finalized specs for Solvane Flux—atmospheric particulate collectors that generate power "
                "even beneath thick industrial ash smog. "
                "Investment unlocks resilient off-grid revenue potential, but ties up liquid reserves during an uncertain macro climate. "
                "Declining prioritizes financial solvency over renewable infrastructure leadership."
            ),
            "invest_desc": "Finance atmospheric balloon trials and collector arrays for Project Solvane Flux.",
            "invest_tradeoff": "Immediate cash outflow. Expands proprietary clean tech patents and institutional goodwill.",
            "invest_deltas": {"innovation": 6.5, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} GREENLIGHTS SOLVANE FLUX TO HARVEST POWER THROUGH SMOG CANOPIES",
            "invest_body": "Defying atmospheric degradation, {company} funded Solvane Flux arrays to generate continuous power through toxic smog layers.",
            "decline_desc": "Shelve Solvane Flux atmospheric arrays in favor of conservative treasury management.",
            "decline_tradeoff": "Preserves cash liquidity, but foregoes unique patent moat against rival energy utilities.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} CONSERVES CAPITAL AS SOLVANE FLUX PROPOSAL REJECTED",
            "decline_body": "{company} leadership chose financial prudence over atmospheric power generation, tabling Solvane Flux.",
        },
    ],
    "Space Mining": [
        {
            "name": "PROJECT HELIOS CORE",
            "subtitle": "Sub-surface orbital laser ablation drill & gravity-tether extraction rig",
            "cost_ratio": 0.30,
            "briefing": (
                "Our off-world engineering guild proposes funding Project Helios Core—a megawatt laser ablation rig engineered "
                "to fracture metal-rich near-Earth asteroids from orbit and reel raw isotope ore into automated refining bays. "
                "Funding this moonshot leapfrogs rival orbital miners, but demands a hefty commitment from company cash. "
                "Declining protects the balance sheet from orbital launch hazards, but leaves unmined asteroidal wealth to competitors."
            ),
            "invest_desc": "Authorize capital transfer for Helios Core laser emitter calibration and deep-space tether rigs.",
            "invest_tradeoff": "Substantial capital commitment. Secures revolutionary asteroid harvest throughput and technological prestige.",
            "invest_deltas": {"innovation": 8.0, "risk": 2.5, "board_confidence": 2.5},
            "invest_headline": "{company} COMMITS HEAVY CAPITAL TO PROJECT HELIOS CORE ORBITAL HARVEST RIG",
            "invest_body": "Aiming for total orbital resource dominance, {company} greenlit Project Helios Core to begin sub-surface asteroid laser extraction.",
            "decline_desc": "Decline the orbital drill proposal to maintain strong balance sheet liquidity.",
            "decline_tradeoff": "Avoids catastrophic deep-space launch exposure, but surrenders claims on high-value orbital ores.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.5, "board_confidence": 0.0},
            "decline_headline": "{company} PASSES ON ASTEROID EXTRACTION RIG, MAINTAINING CASH BUFFER",
            "decline_body": "{company} executives vetoed the Helios Core proposal, citing the high cost and volatility of deep-space extraction hardware.",
        },
        {
            "name": "PROJECT VACUUM SMELTER",
            "subtitle": "Zero-gravity magnetic induction refining chamber for rare planetary alloys",
            "cost_ratio": 0.26,
            "briefing": (
                "Orbital metallurgical teams have drafted blueprints for an in-situ Vacuum Smelter that refines titanium and platinum "
                "alloys directly in microgravity without fuel-expensive atmospheric re-entry. "
                "Funding guarantees unmatched supply margins, but depletes liquid cash. "
                "Declining avoids capital lockup while competitors gamble on off-world metallurgy."
            ),
            "invest_desc": "Fund orbital assembly and microgravity magnetic smelting trials.",
            "invest_tradeoff": "Direct cash reduction. Establishes patented microgravity metallurgy superiority.",
            "invest_deltas": {"innovation": 7.0, "risk": 2.0, "board_confidence": 2.0},
            "invest_headline": "{company} LAUNCHES ZERO-GRAVITY VACUUM SMELTING INITIATIVE",
            "invest_body": "In a bold aerospace manufacturing move, {company} funded the Vacuum Smelter project to refine precious asteroid ores in orbit.",
            "decline_desc": "Decline zero-g smelting funding to preserve terrestrial treasury liquidity.",
            "decline_tradeoff": "Keeps funds intact, but foregoes massive downstream margin efficiencies.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} STICKS TO CONSERVATIVE LIQUIDITY, REJECTING VACUUM SMELTER",
            "decline_body": "{company} leadership passed on zero-gravity smelting, keeping corporate capital safely grounded.",
        },
    ],
    "Healthcare": [
        {
            "name": "PROJECT SYNAPSE MESH",
            "subtitle": "Bio-synthetic neural repair scaffolds & rapid regenerative cellular matrix",
            "cost_ratio": 0.28,
            "briefing": (
                "The biomedical institute proposes advancing Project Synapse Mesh—synthetic bio-scaffolding capable of "
                "accelerating neuro-regeneration and reversing cellular trauma from toxic fallout. "
                "Funding gives our hospitals an unassailable clinical monopoly and elevated client devotion. "
                "Declining preserves crucial funds for pharmaceutical stockpiling, but delays curative clinical breakthroughs."
            ),
            "invest_desc": "Finance accelerated clinical trials and neural scaffold synthesis.",
            "invest_tradeoff": "Reduces liquid cash reserves. Elevates innovation velocity, client trust, and institutional authority.",
            "invest_deltas": {"innovation": 7.5, "risk": 2.0, "board_confidence": 2.5},
            "invest_headline": "{company} BACKS PROJECT SYNAPSE MESH IN GROUNDBREAKING NEURAL HEALING BET",
            "invest_body": "{company} unveiled major capital funding for Project Synapse Mesh, betting on bio-synthetic neural repair to revolutionize post-apocalyptic healthcare.",
            "decline_desc": "Reject Synapse Mesh funding to preserve liquid healthcare procurement reserves.",
            "decline_tradeoff": "Shields operating cash from regulatory trial uncertainties, but gives up medical supremacy.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} DEFERS SYNAPSE MESH TRIALS AMID CAUTIOUS FISCAL OUTLOOK",
            "decline_body": "{company} held its treasury firm, declining to sponsor Project Synapse Mesh clinical research at this time.",
        },
        {
            "name": "PROJECT IMMUNO-CORE",
            "subtitle": "Automated synthetic antibody synthesizer & bioweapon antidote foundry",
            "cost_ratio": 0.25,
            "briefing": (
                "Our virology wing has designed Immuno-Core—an automated foundry capable of sequencing and manufacturing custom "
                "viral countermeasures within hours of an urban pathogen outbreak. "
                "Financing this lab ensures life-saving urban contracts, but consumes corporate liquid capital. "
                "Declining keeps reserves ready for conventional hospital operating expenses."
            ),
            "invest_desc": "Fund Immuno-Core automated antibody sequencing facilities.",
            "invest_tradeoff": "Significant capital expenditure. Massive health sector prestige and biosecurity capability.",
            "invest_deltas": {"innovation": 7.0, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} FUNDS IMMUNO-CORE RAPID PATHOGEN DEFENSE FOUNDRY",
            "invest_body": "Preparing for emerging metropolitan bio-threats, {company} financed the Immuno-Core antibody synthesizer project.",
            "decline_desc": "Decline the automated pathogen foundry to protect working liquidity.",
            "decline_tradeoff": "Conserves cash, but leaves medical teams reliant on slow manual antibody development.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} SHELVES IMMUNO-CORE TO SAFEGUARD SHORT-TERM CASH",
            "decline_body": "{company} directors voted against Immuno-Core funding, choosing cash conservation over automated bio-defense.",
        },
    ],
    "Airlines": [
        {
            "name": "PROJECT MACH-7 STRATOGLIDER",
            "subtitle": "Cryogenic scramjet engines & hypersonic atmospheric corridor navigation array",
            "cost_ratio": 0.28,
            "briefing": (
                "Aviation skunkworks proposes Project Stratoglider—retrofitted hypersonic scramjet turbines capable of cutting "
                "transcontinental transit to under forty minutes above toxic weather systems. "
                "Funding establishes an elite aerospace monopoly that competitors cannot match. "
                "Declining avoids aerospace engineering risks and preserves cash for fuel reserves, but surrenders high-speed dominance."
            ),
            "invest_desc": "Fund scramjet wind-tunnel tests and cryogenic propellant integration.",
            "invest_tradeoff": "Heavy immediate capital outlay. Massive aviation tech lead and passenger prestige.",
            "invest_deltas": {"innovation": 8.0, "risk": 2.5, "board_confidence": 2.0},
            "invest_headline": "{company} UNVEILS PROJECT STRATOGLIDER FOR HYPERSONIC PASSENGER CORRIDORS",
            "invest_body": "{company} committed aggressive R&D funding to Project Stratoglider, promising hypersonic travel between safe metropolitan enclaves.",
            "decline_desc": "Decline scramjet turbine funding to preserve precious fuel and maintenance cash.",
            "decline_tradeoff": "Shields working capital from costly aerodynamic failures, but limits fleet to aging subsonic jets.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} CANCELS STRATOGLIDER EXPERIMENT TO PRESERVE RUNWAY RESERVES",
            "decline_body": "{company} rejected experimental hypersonic scramjet funding, keeping its balance sheet grounded in fiscal discipline.",
        },
        {
            "name": "PROJECT AVIONICS AEGIS",
            "subtitle": "Synthetic aperture turbulence radar & automated EMP-hardened fly-by-wire",
            "cost_ratio": 0.24,
            "briefing": (
                "Flight systems engineers have blueprinted Avionics Aegis—a hardened neural cockpit navigation suite that "
                "safely navigates ion storms and volcanic ash plumes that ground all other airlines. "
                "Funding guarantees operational uptime in worst-case storms, but consumes corporate capital. "
                "Declining preserves funds for routine fleet overhauls."
            ),
            "invest_desc": "Finance avionics cockpit retrofits and electromagnetic radiation hardening.",
            "invest_tradeoff": "Capital deduction. Improves flight safety ratings, reliability, and innovation stature.",
            "invest_deltas": {"innovation": 6.5, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} COMMITS FUNDS TO AVIONICS AEGIS ALL-WEATHER FLIGHT SYSTEM",
            "invest_body": "{company} authorized capital outlays for Avionics Aegis, ensuring its planes remain airborne even through severe ion storms.",
            "decline_desc": "Decline cockpit suite upgrades to maintain high cash reserves.",
            "decline_tradeoff": "Preserves cash, but leaves aircraft susceptible to weather grounding and lost flight revenues.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} SAYS NO TO AVIONICS AEGIS, CITING CAPITAL DISCIPLINE",
            "decline_body": "{company} leadership chose cash preservation over ion-storm avionics upgrades.",
        },
    ],
    "Banking": [
        {
            "name": "PROJECT QUANTUM LEDGER",
            "subtitle": "Zero-knowledge sovereign settlement network & autonomous liquidity arbitrage",
            "cost_ratio": 0.28,
            "briefing": (
                "The quantitative research group proposes funding Project Quantum Ledger—a cryptographic settlement protocol "
                "executing zero-delay sovereign bond clearance and automated liquidity arbitrage across surviving corporate enclaves. "
                "Funding this protocol cements our position as the indisputable central ledger of New Kalki City. "
                "Declining preserves cash reserves for conservative lending, but risks technological obsolescence against algorithmic competitors."
            ),
            "invest_desc": "Deploy capital to build and deploy Quantum Ledger nodes and secure financial cryptography pipelines.",
            "invest_tradeoff": "Deducts liquidity from the treasury. Unlocks elite financial engineering prestige and institutional confidence.",
            "invest_deltas": {"innovation": 7.0, "risk": 2.0, "board_confidence": 2.5},
            "invest_headline": "{company} REVOLUTIONIZES SETTLEMENTS WITH PROJECT QUANTUM LEDGER",
            "invest_body": "Cementing its financial hegemony, {company} funded Project Quantum Ledger to run automated zero-knowledge settlements across corporate sectors.",
            "decline_desc": "Shelve Quantum Ledger to preserve pristine balance sheet liquid reserves.",
            "decline_tradeoff": "Preserves high liquidity cushion, but leaves trading execution vulnerable to faster algorithmic rivals.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} DEFERS QUANTUM LEDGER AMID CONSERVATIVE LIQUIDITY MANDATE",
            "decline_body": "{company} opted to safeguard its liquid treasury, declining to fund the high-tech Quantum Ledger architecture.",
        },
        {
            "name": "PROJECT AEGIS ARBITRAGE",
            "subtitle": "Predictive macro-risk modeling & algorithmic insolvency protection engine",
            "cost_ratio": 0.25,
            "briefing": (
                "Financial mathematics fellows have devised Aegis Arbitrage—a predictive neural engine that foresees corporate defaults "
                "and hedges our debt portfolio across volatile commodities weeks before market crashes occur. "
                "Funding guarantees balance sheet resilience and boardroom prestige, but requires an immediate cash allocation. "
                "Declining preserves funds in low-yield vault reserves."
            ),
            "invest_desc": "Finance compute cluster acquisition for the Aegis Arbitrage macro predictive engine.",
            "invest_tradeoff": "Direct cash reduction. Drastically sharpens risk forecasting and institutional investor trust.",
            "invest_deltas": {"innovation": 6.5, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} FUNDS AEGIS ARBITRAGE NEURAL RISK PROTOCOL",
            "invest_body": "{company} allocated capital to Aegis Arbitrage, arming its trading desks with predictive macro-risk neural modeling.",
            "decline_desc": "Reject predictive engine development to keep capital safely in vault reserves.",
            "decline_tradeoff": "Conserves cash, but leaves credit underwriting exposed to sudden macro shocks.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} WITHHOLDS FUNDS FROM AEGIS ARBITRAGE PROJECT",
            "decline_body": "{company} executives vetoed the neural risk modeling proposal, preserving liquid capital.",
        },
    ],
    "Media": [
        {
            "name": "PROJECT MINDWAVE PULSE",
            "subtitle": "Direct-to-cortex broadcast array & biometric sentiment synthesis transmitter",
            "cost_ratio": 0.28,
            "briefing": (
                "The neural broadcast laboratory proposes commissioning Project Mindwave Pulse—transmitters capable of delivering "
                "holographic news and commercial feeds directly to consumer neural implants without physical screens. "
                "Funding this moonshot guarantees complete audience capture and unmatched cultural dominance. "
                "Declining preserves precious broadcast operating cash, but leaves mental bandwidth open to rival media syndicates."
            ),
            "invest_desc": "Fund sub-ether transmitter towers and biometric neural streaming calibration.",
            "invest_tradeoff": "Substantial immediate capital drain. Massive leap in innovation velocity and cultural brand equity.",
            "invest_deltas": {"innovation": 8.0, "risk": 2.5, "board_confidence": 2.0},
            "invest_headline": "{company} COMMITS CAPITAL TO MINDWAVE PULSE DIRECT-CORTEX BROADCASTING",
            "invest_body": "{company} shocked media analysts by bankrolling Project Mindwave Pulse, a radical direct-to-cortex broadcast grid.",
            "decline_desc": "Decline cortical broadcasting to preserve liquid cash for traditional media production.",
            "decline_tradeoff": "Preserves cash cushion, but foregoes direct neuro-marketing dominance.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} REJECTS MINDWAVE PULSE EXPERIMENT, PROTECTING BUDGET",
            "decline_body": "{company} board voted against cortical transmission tech, opting for conventional broadcasting and fiscal safety.",
        },
        {
            "name": "PROJECT HOLONET RELAY",
            "subtitle": "Sub-orbital atmospheric laser repeater for uninterrupted global media feeds",
            "cost_ratio": 0.25,
            "briefing": (
                "Broadcast engineers have engineered HoloNet Relay—high-altitude laser balloons that bypass terrestrial jamming "
                "to provide uninterrupted ultra-high-definition broadcasts across all post-apocalyptic zones. "
                "Investment secures unjammable market reach, but costs a significant chunk of liquid treasury. "
                "Declining retains cash for studio operations and investigative reporting."
            ),
            "invest_desc": "Finance laser repeater balloon launches and signal decoders.",
            "invest_tradeoff": "Immediate cash reduction. Delivers reliable broadcast market share and tech prestige.",
            "invest_deltas": {"innovation": 6.5, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} LAUNCHES HOLONET RELAY FOR UNJAMMABLE METRO BROADCASTS",
            "invest_body": "Ensuring its voice penetrates every corner of New Kalki City, {company} funded the HoloNet Relay balloon grid.",
            "decline_desc": "Decline high-altitude relay launches to maintain strong operating cash.",
            "decline_tradeoff": "Keeps cash safe, but leaves terrestrial signals vulnerable to rival jamming.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} CONSERVES CAPITAL AS HOLONET RELAY LAUNCHES SHELVED",
            "decline_body": "{company} passed on the HoloNet Relay laser grid, citing high capital costs.",
        },
    ],
    "Logistics": [
        {
            "name": "PROJECT FERROVAX NEURAL ROUTING",
            "subtitle": "Autonomous maglev freight corridors & quantum-scheduled intermodal dispatch",
            "cost_ratio": 0.28,
            "briefing": (
                "Our transport engineering division proposes Project Ferrovax—an autonomous dispatch network that uses quantum algorithms "
                "to dynamically re-route bullet maglev freight cars around hazardous wasteland sectors without human trainmasters. "
                "Funding gives us the fastest, lowest-loss transport network on the continent. "
                "Declining safeguards cash for truck convoy fuel and driver wages, but forfeits automated rail supremacy."
            ),
            "invest_desc": "Finance autonomous maglev signal relays and quantum dispatch server racks.",
            "invest_tradeoff": "Immediate capital reduction. Drastically boosts transport throughput and logistics innovation.",
            "invest_deltas": {"innovation": 7.5, "risk": 2.0, "board_confidence": 2.0},
            "invest_headline": "{company} PLEDGES MILLIONS TO FERROVAX NEURAL ROUTING MAGLEV CORRIDORS",
            "invest_body": "{company} approved full funding for Ferrovax Neural Routing, automating cross-continental maglev freight dispatch.",
            "decline_desc": "Decline quantum rail routing to preserve liquidity for daily fleet maintenance.",
            "decline_tradeoff": "Protects cash cushion, but leaves cargo exposed to human dispatch bottlenecks and raider intercepts.",
            "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
            "decline_headline": "{company} PASSES ON FERROVAX AUTOMATION, CITING BUDGET REALITIES",
            "decline_body": "{company} decided against maglev quantum routing, maintaining existing dispatch methods and cash reserves.",
        },
        {
            "name": "PROJECT STRATO-CARGO",
            "subtitle": "Solar-electric heavy lift cargo zeppelins for hazardous terrain avoidance",
            "cost_ratio": 0.25,
            "briefing": (
                "Fleet designers have finished blueprints for Strato-Cargo zeppelins—rigid airships capable of hauling hundreds "
                "of tons of heavy industrial cargo over radioactive quarantine zones where rail lines have collapsed. "
                "Funding establishes exclusive overland freight monopolies, but demands a serious cash commitment. "
                "Declining protects the balance sheet from aeronautical development costs."
            ),
            "invest_desc": "Commission construction of the first Strato-Cargo prototype airship.",
            "invest_tradeoff": "Substantial capital commitment. Secures unique geographic supply route dominance.",
            "invest_deltas": {"innovation": 7.0, "risk": 1.5, "board_confidence": 2.0},
            "invest_headline": "{company} GREENLIGHTS STRATO-CARGO HEAVY-LIFT FREIGHT ZEPPELINS",
            "invest_body": "Bypassing broken highways, {company} funded Strato-Cargo airships to airlift heavy industrial freight over wasteland zones.",
            "decline_desc": "Veto the airship project to keep corporate treasury liquid.",
            "decline_tradeoff": "Keeps money safe in the bank, but leaves shipments bound to deteriorating road corridors.",
            "decline_deltas": {"innovation": 0.0, "risk": -0.5, "board_confidence": 0.0},
            "decline_headline": "{company} WITHHOLDS AIRSHIP CAPITAL TO DEFEND BALANCE SHEET",
            "decline_body": "{company} executives vetoed Strato-Cargo airship funding, preserving liquid capital for core road transport.",
        },
    ],
}

# Fallback generic template if sector doesn't match
FALLBACK_RD_TEMPLATE: Dict[str, Any] = {
    "name": "PROJECT HELIX",
    "subtitle": "Next-generation process intelligence & automated synthesis platform",
    "cost_ratio": 0.28,
    "briefing": (
        "The R&D team proposes an initial capital commitment to Project Helix. "
        "The initiative could improve operational efficiency and long-term innovation capacity "
        "over future quarters, but its commercialization is uncertain. "
        "Funding the project will reduce available liquidity and prevent that cash from being deployed elsewhere. "
        "Declining preserves capital for other priorities but foregoes a potential technological leap."
    ),
    "invest_desc": "Commit corporate capital to fund the initial Phase 1 engineering pipeline for Project Helix.",
    "invest_tradeoff": "Immediate cash reduction. Enhances innovation capability and technical prestige at the cost of short-term liquidity reserves.",
    "invest_deltas": {"innovation": 6.5, "risk": 2.0, "board_confidence": 2.0},
    "invest_headline": "{company} COMMITS CAPITAL TO PROJECT HELIX AMID UNCERTAIN INNOVATION OUTLOOK",
    "invest_body": "In a decisive strategic directive, {company} greenlit Phase 1 capital expenditure for Project Helix, prioritizing next-gen process intelligence.",
    "decline_desc": "Decline the Project Helix research proposal to preserve pristine liquid treasury reserves.",
    "decline_tradeoff": "Preserves available cash and shields the balance sheet from speculative research risk, but surrenders immediate technological advantage.",
    "decline_deltas": {"innovation": 0.0, "risk": -1.0, "board_confidence": 0.0},
    "decline_headline": "{company} PRESERVES LIQUIDITY AS RESEARCH PROPOSAL IS DEFERRED",
    "decline_body": "{company} leadership has formally rejected the Project Helix funding mandate, prioritizing treasury discipline and liquid balance sheet reserves.",
}


def build_sector_rd_spec(sector: str, current_cash: float, seed: int) -> Dict[str, Any]:
    """
    Builds a dynamic R&D project specification tailored to the company's sector.
    The proposal is deterministically selected based on the seed (company id + quarter),
    and its cost is scaled proportionally to available liquid cash while ensuring:
      1. Cost never exceeds current liquid cash (cost <= current_cash).
      2. If current_cash is 0 or very small, cost is capped at current_cash.
      3. Rounded cleanly to the nearest thousand (or hundred).
    """
    rng = random.Random(seed)
    templates = SECTOR_RD_TEMPLATES.get(sector, [FALLBACK_RD_TEMPLATE])
    template = rng.choice(templates)

    # Calculate balanced cost based on current liquid cash
    # Base ratio is ~25-30% of current cash, but hard-capped at current_cash
    target_cost = current_cash * template.get("cost_ratio", 0.28)
    
    # Round to nearest 1,000 if >= 10,000, else to nearest 500
    if target_cost >= 10000:
        calculated_cost = round(target_cost / 1000.0) * 1000.0
    elif target_cost >= 2000:
        calculated_cost = round(target_cost / 500.0) * 500.0
    else:
        calculated_cost = round(target_cost / 100.0) * 100.0

    # Strict constraint: max cost <= current liquid cash
    cost = max(0.0, min(float(current_cash), float(calculated_cost)))

    project_name = template["name"]
    project_id = project_name.lower().replace(" ", "_")

    options = [
        {
            "id": "invest",
            "title": f"OPTION A — INVEST IN {project_name}",
            "action_label": "INVEST",
            "cost_cash": cost,
            "description": template["invest_desc"],
            "tradeoff": template["invest_tradeoff"],
            "stat_deltas": template["invest_deltas"],
            "press_headline": template["invest_headline"],
            "press_body": template["invest_body"],
        },
        {
            "id": "decline",
            "title": f"OPTION B — DECLINE {project_name}",
            "action_label": "DON'T INVEST",
            "cost_cash": 0.0,
            "description": template["decline_desc"],
            "tradeoff": template["decline_tradeoff"],
            "stat_deltas": template["decline_deltas"],
            "press_headline": template["decline_headline"],
            "press_body": template["decline_body"],
        },
    ]

    return {
        "id": project_id,
        "name": project_name,
        "subtitle": template["subtitle"],
        "briefing": template["briefing"],
        "cost_cash": cost,
        "options": options,
    }
