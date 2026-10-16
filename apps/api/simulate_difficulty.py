"""
Full Authoritative Gameplay Difficulty Simulation Script.
Runs 100 seeds for each of 4 player archetypes through Quarters 1-4.
Uses real engine tick, market dilemmas, client negotiation formulas, press evaluations,
and board room confidence mechanics.
"""

import sys
import random
from typing import Dict, Any, List

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from app.simulation.engine import tick
from app.simulation.models import CompanyState as EngineState, Decision, MarketSnapshot
from app.services.market_dilemma_service import QUARTER_MARKETING_DILEMMAS
from app.board.loader import load_board_script
from app.board.scoring import resolve_outcome
from app.scoring.formula import calculate_final_score
from app.scoring.config_loader import load_scoring_config


def run_single_simulation(seed: int, archetype: str) -> Dict[str, Any]:
    rng = random.Random(seed)

    # Initial state
    state = {
        "cash": 100000.0,
        "revenue": 50000.0,
        "profit": 10000.0,
        "debt": 0.0,
        "stock_price": 100.0,
        "employees": 50,
        "innovation": 50.0,
        "brand": 50.0,
        "client_satisfaction": 50.0,
        "employee_satisfaction": 50.0,
        "investor_confidence": 50.0,
        "esg": 50.0,
        "risk": 20.0,
        "market_share": 10.0,
        "board_confidence": 70.0,
    }

    quarterly_history = [dict(state)]
    q1_deal_won = False
    q2_deal_won = False
    status = "SURVIVED"
    ending_quarter = 4
    terminal_reason = "Completed all 4 quarters."

    scoring_cfg = load_scoring_config()

    for q in range(1, 5):
        # -------------------------------------------------------------
        # 1. FINANCE & OPERATIONS (Budget allocation & engine tick)
        # -------------------------------------------------------------
        if archetype == "conservative":
            # Spends prudently: ~₹14,000 (capped at 20% of cash)
            base = min(14000.0, state["cash"] * 0.20)
            ops_decisions = [
                Decision(category="automation", amount=round(base * 0.28, -2)),
                Decision(category="marketing", amount=round(base * 0.28, -2)),
                Decision(category="rnd", amount=round(base * 0.24, -2)),
                Decision(category="hiring", amount=round(base * 0.20, -2)),
            ]
        elif archetype == "balanced":
            # Spends moderately: ₹22,000 in Q1/Q2; adjusts to available liquidity in Q3/Q4
            if q <= 2:
                base = min(22000.0, state["cash"] * 0.35)
            elif q == 3:
                base = min(14000.0, max(3000.0, (state["cash"] - 15000.0) * 0.35))
            else:
                base = min(8000.0, max(2000.0, (state["cash"] - 20000.0) * 0.30))

            ops_decisions = [
                Decision(category="automation", amount=round(base * 0.30, -2)),
                Decision(category="marketing", amount=round(base * 0.28, -2)),
                Decision(category="rnd", amount=round(base * 0.22, -2)),
                Decision(category="hiring", amount=round(base * 0.20, -2)),
            ]
        elif archetype == "aggressive":
            # High spend: 45% of cash in Q1/Q2, scales down in Q3/Q4 to preserve liquidity for dilemmas
            if q <= 2:
                base = min(36000.0, state["cash"] * 0.45)
            elif q == 3:
                base = min(16000.0, max(2000.0, state["cash"] - 12000.0) * 0.35)
            else:
                base = min(6000.0, max(0.0, state["cash"] - 4000.0) * 0.20)

            ops_decisions = [
                Decision(category="automation", amount=round(base * 0.30, -2)),
                Decision(category="marketing", amount=round(base * 0.30, -2)),
                Decision(category="rnd", amount=round(base * 0.22, -2)),
                Decision(category="hiring", amount=round(base * 0.18, -2)),
            ]
        else:  # reckless
            # Overspends: 65-75% of cash
            base = min(55000.0, state["cash"] * 0.65)
            ops_decisions = [
                Decision(category="automation", amount=round(base * 0.30, -2)),
                Decision(category="marketing", amount=round(base * 0.32, -2)),
                Decision(category="rnd", amount=round(base * 0.20, -2)),
                Decision(category="hiring", amount=round(base * 0.18, -2)),
            ]

        total_ops_spend = sum(d.amount for d in ops_decisions)
        if total_ops_spend >= state["cash"]:
            status = "BANKRUPT"
            ending_quarter = q
            terminal_reason = f"Operations budget commit ₹{total_ops_spend:,.0f} exceeded cash ₹{state['cash']:,.0f} in Q{q}."
            break

        # Apply operations tick
        eng_state = EngineState(**{k: v for k, v in state.items()})
        eng_market = MarketSnapshot(interest_rate=4.5 + q * 0.5, inflation=3.0 + q * 0.8)
        tick_res = tick(eng_state, ops_decisions, market=eng_market, seed=seed + q)
        state["cash"] = tick_res.new_state.cash
        for k, v in tick_res.deltas.items():
            if k in state and k != "cash":
                if k == "employees":
                    state[k] = max(1, int(round(state[k] + v)))
                else:
                    state[k] = max(0.0, min(100.0, state[k] + v))
        state["revenue"] = tick_res.new_state.revenue
        state["profit"] = tick_res.new_state.profit

        # -------------------------------------------------------------
        # 2. MARKETING STRATEGIC DILEMMA
        # -------------------------------------------------------------
        dilemma = QUARTER_MARKETING_DILEMMAS[q]
        options = dilemma["options"]
        if archetype == "conservative":
            opt = options[3]  # lowest cost / preserve cash (Q1=0, Q2=9k, Q3=15k, Q4=20k)
        elif archetype == "balanced":
            if q == 1:
                opt = options[2]  # defensive retention (₹8,000)
            elif q == 2:
                opt = options[2]  # niche counter (₹14,000)
            elif q == 3:
                opt = options[2] if state["cash"] >= 45000.0 else options[3]  # hedging ₹22k or defense ₹15k
            else:
                opt = options[2] if state["cash"] >= 40000.0 else options[3]  # shield ₹28k or emergency ₹20k
        elif archetype == "aggressive":
            # Aggressive picks high-growth option if cash allows, else sustainable growth
            if q == 1:
                opt = options[0]  # blitz ₹25,000
            elif q == 2:
                opt = options[0] if state["cash"] >= 45000.0 else (options[1] if state["cash"] >= 28000.0 else options[3])
            elif q == 3:
                opt = options[0] if state["cash"] >= 55000.0 else (options[1] if state["cash"] >= 40000.0 else options[3])
            else:
                opt = options[0] if state["cash"] >= 65000.0 else (options[1] if state["cash"] >= 48000.0 else options[3])
        else:
            # Reckless picks high cost if affordable, else lowest cost to stagger into board meeting
            affordable_opts = [o for o in options if o["cost_cash"] <= state["cash"]]
            opt = affordable_opts[0] if affordable_opts else options[0]

        mkt_cost = opt["cost_cash"]
        if mkt_cost >= state["cash"]:
            status = "BANKRUPT"
            ending_quarter = q
            terminal_reason = f"Market directive commit ₹{mkt_cost:,.0f} exceeded cash ₹{state['cash']:,.0f} in Q{q}."
            break

        state["cash"] -= mkt_cost
        for k, v in opt["stat_deltas"].items():
            if k in state and k != "cash":
                state[k] = max(0.0, min(100.0, state[k] + v))

        # -------------------------------------------------------------
        # 3. RESEARCH & DEVELOPMENT (Project Genesis / Sector R&D)
        # -------------------------------------------------------------
        rd_cost = round((state["cash"] * 0.25) / 1000.0) * 1000.0
        if archetype == "conservative":
            # Conservative declines R&D (Option B: costs ₹0) to preserve liquidity
            pass
        elif archetype == "balanced":
            # Balanced invests in Q1 (approx ₹18,000) when cash is high, declines when cash is tight
            if q == 1 and state["cash"] >= 50000.0 and rd_cost > 0:
                state["cash"] -= rd_cost
                state["innovation"] = min(100.0, state["innovation"] + 6.0)
        elif archetype == "aggressive":
            # Aggressive attempts R&D whenever liquid cash is above ₹25,000
            if state["cash"] >= 25000.0 and rd_cost > 0:
                state["cash"] -= rd_cost
                state["innovation"] = min(100.0, state["innovation"] + 8.0)
        else:
            # Reckless invests in R&D whenever liquid cash is at least ₹20,000 (otherwise button disabled in UI)
            if state["cash"] >= 20000.0:
                reckless_rd = 20000.0
                state["cash"] -= reckless_rd
                state["innovation"] = min(100.0, state["innovation"] + 6.0)

        # -------------------------------------------------------------
        # 4. CLIENT WORLD (Commercial Contracts & SLA Reviews)
        # -------------------------------------------------------------
        if q == 1:
            # Pitching & commercial negotiation
            if archetype == "conservative":
                win_prob = 0.88
                val = 28000.0
            elif archetype == "balanced":
                win_prob = 0.75
                val = 35000.0
            elif archetype == "aggressive":
                win_prob = 0.50
                val = 48000.0
            else:
                win_prob = 0.15
                val = 60000.0  # Over-quoted against procurement ceiling

            if rng.random() < win_prob:
                q1_deal_won = True
                cash_gain = round(val * 0.85, 2)
                state["cash"] += cash_gain
                state["revenue"] += val
                state["client_satisfaction"] = min(100.0, state["client_satisfaction"] + 8.0)
                state["market_share"] = min(100.0, state["market_share"] + 1.2)
            else:
                state["client_satisfaction"] = max(0.0, state["client_satisfaction"] - 2.0)

        elif q == 2:
            # Director of Commercial Accounts subordinate briefing: 3 choices
            base_budget = 40000.0
            if archetype == "conservative":
                # Conservative tier: 90% of budget -> guaranteed approval
                win_prob = 0.95
                val = base_budget * 0.90
            elif archetype == "balanced":
                # Balanced tier: 105% of budget -> solid win rate
                win_prob = 0.70
                val = base_budget * 1.05
            elif archetype == "aggressive":
                # Aggressive tier: 125% of budget -> high risk
                win_prob = 0.40
                val = base_budget * 1.25
            else:
                win_prob = 0.15
                val = base_budget * 1.25

            if rng.random() < win_prob:
                q2_deal_won = True
                cash_gain = round(val * 0.85, 2)
                state["cash"] += cash_gain
                state["revenue"] += val
                state["client_satisfaction"] = min(100.0, state["client_satisfaction"] + 8.0)
                state["market_share"] = min(100.0, state["market_share"] + 1.5)
            else:
                state["client_satisfaction"] = max(0.0, state["client_satisfaction"] - 3.0)

        elif q == 3:
            # Q3 Client SLA review (only if Q1 deal won)
            if q1_deal_won:
                remediation_cost = 6000.0
                if remediation_cost >= state["cash"]:
                    status = "BANKRUPT"
                    ending_quarter = 3
                    terminal_reason = f"Q3 Client SLA remediation ₹{remediation_cost:,.0f} exceeded cash ₹{state['cash']:,.0f}."
                    break
                state["cash"] -= remediation_cost
                state["client_satisfaction"] = min(100.0, state["client_satisfaction"] + 5.0)

        elif q == 4:
            # Q4 Client SLA review (only if Q2 deal won)
            if q2_deal_won:
                remediation_cost = 8000.0
                if remediation_cost >= state["cash"]:
                    status = "BANKRUPT"
                    ending_quarter = 4
                    terminal_reason = f"Q4 Client SLA remediation ₹{remediation_cost:,.0f} exceeded cash ₹{state['cash']:,.0f}."
                    break
                state["cash"] -= remediation_cost
                state["client_satisfaction"] = min(100.0, state["client_satisfaction"] + 5.0)

        # -------------------------------------------------------------
        # 5. PRESS WORLD
        # -------------------------------------------------------------
        if q == 1:
            if archetype in ("conservative", "balanced"):
                # Professional response
                state["brand"] = min(100.0, state["brand"] + 2.0)
                state["board_confidence"] = min(100.0, state["board_confidence"] + 2.0)
            elif archetype == "aggressive":
                state["brand"] = min(100.0, state["brand"] + 4.0)
                state["risk"] = min(100.0, state["risk"] + 2.0)
            else:
                # Evasive / Damaging
                state["brand"] = max(0.0, state["brand"] - 6.0)
                state["board_confidence"] = max(0.0, state["board_confidence"] - 6.0)
                state["risk"] = min(100.0, state["risk"] + 5.0)
        elif q == 2:
            # 1 exchange
            if archetype in ("conservative", "balanced"):
                state["brand"] = min(100.0, state["brand"] + 3.0)
                state["board_confidence"] = min(100.0, state["board_confidence"] + 3.0)
            elif archetype == "aggressive":
                state["brand"] = min(100.0, state["brand"] + 4.0)
                state["risk"] = min(100.0, state["risk"] + 2.0)
            else:
                state["brand"] = max(0.0, state["brand"] - 6.0)
                state["board_confidence"] = max(0.0, state["board_confidence"] - 6.0)

        # -------------------------------------------------------------
        # 6. BOARD MEETING
        # -------------------------------------------------------------
        script = load_board_script(q)
        deltas = []
        for exchange in script:
            opts = exchange["options"]
            if archetype == "conservative":
                # Chooses highest confidence delta
                best_opt = max(opts, key=lambda o: o["confidence_delta"])
                deltas.append(float(best_opt["confidence_delta"]))
            elif archetype == "balanced":
                # Chooses solid positive options (2nd best or best)
                sorted_opts = sorted(opts, key=lambda o: o["confidence_delta"], reverse=True)
                deltas.append(float(sorted_opts[1]["confidence_delta"]))
            elif archetype == "aggressive":
                # Mix of expansion (+2, +3) and high risk
                deltas.append(float(opts[1]["confidence_delta"]))
            else:  # reckless
                # Worst options (-4, -5)
                worst_opt = min(opts, key=lambda o: o["confidence_delta"])
                deltas.append(float(worst_opt["confidence_delta"]))

        if sum(deltas) < 0:
            deltas.append(-5.0)

        final_conf, fired = resolve_outcome(state["board_confidence"], deltas)
        state["board_confidence"] = final_conf

        if fired:
            status = "FIRED"
            ending_quarter = q
            terminal_reason = f"Board confidence collapsed ({final_conf:.1f}%) in Q{q}."
            break

        quarterly_history.append(dict(state))

    # Calculate final score
    score_res = calculate_final_score(quarterly_history, scoring_cfg)
    final_score = score_res["final_score"]

    return {
        "seed": seed,
        "archetype": archetype,
        "status": status,
        "ending_quarter": ending_quarter,
        "final_cash": state["cash"],
        "final_conf": state["board_confidence"],
        "final_score": final_score,
        "terminal_reason": terminal_reason,
    }


def run_full_simulation(num_seeds: int = 100):
    archetypes = ["conservative", "balanced", "aggressive", "reckless"]
    results_by_archetype = {a: [] for a in archetypes}

    for arch in archetypes:
        for s in range(num_seeds):
            res = run_single_simulation(seed=1000 + s, archetype=arch)
            results_by_archetype[arch].append(res)

    print("=" * 70)
    print(f"CORPORATE APOCALYPSE 2400 — DIFFICULTY BALANCE SIMULATION ({num_seeds} seeds/archetype)")
    print("=" * 70)

    for arch in archetypes:
        runs = results_by_archetype[arch]
        survived = [r for r in runs if r["status"] == "SURVIVED"]
        bankrupt = [r for r in runs if r["status"] == "BANKRUPT"]
        fired = [r for r in runs if r["status"] == "FIRED"]

        surv_rate = (len(survived) / len(runs)) * 100
        bank_rate = (len(bankrupt) / len(runs)) * 100
        fire_rate = (len(fired) / len(runs)) * 100

        avg_score = sum(r["final_score"] for r in runs) / len(runs)
        avg_cash = sum(r["final_cash"] for r in runs) / len(runs)
        avg_conf = sum(r["final_conf"] for r in runs) / len(runs)

        q_breakdown = {1: 0, 2: 0, 3: 0, 4: 0}
        for r in runs:
            q_breakdown[r["ending_quarter"]] += 1

        print(f"\nARCHETYPE: {arch.upper()}")
        print(f"  Survival Rate:   {surv_rate:5.1f}% ({len(survived)}/{len(runs)})")
        print(f"  Bankruptcy Rate: {bank_rate:5.1f}% ({len(bankrupt)}/{len(runs)})")
        print(f"  Dismissal Rate:  {fire_rate:5.1f}% ({len(fired)}/{len(runs)})")
        print(f"  Avg Final Score: {avg_score:5.1f} PTS")
        print(f"  Avg Final Cash:  ₹{avg_cash:,.0f}")
        print(f"  Avg Board Conf:  {avg_conf:5.1f}%")
        print(f"  Ending Quarter Distribution: Q1={q_breakdown[1]}, Q2={q_breakdown[2]}, Q3={q_breakdown[3]}, Q4={q_breakdown[4]}")
        if bankrupt:
            print(f"  Sample Bankruptcy Reason: {bankrupt[0]['terminal_reason']}")
        if fired:
            print(f"  Sample Dismissal Reason: {fired[0]['terminal_reason']}")


if __name__ == "__main__":
    run_full_simulation(100)
