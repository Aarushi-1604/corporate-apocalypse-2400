"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { soundManager } from "@/lib/audio";
import { Timer, Plus, Minus, Trophy, RotateCcw, Target, ArrowRight } from "lucide-react";

/**
 * DiminishingReturnsLab
 * A timed, scored allocation challenge that teaches diminishing marginal returns by play.
 * The curves here are ILLUSTRATIVE teaching models -- they do not modify backend persistent state.
 */

interface Dept {
  label: string;
  blurb: string;
  max: number; // ceiling of output
  k: number; // how fast it saturates (higher = saturates faster)
  color: string;
}

interface Round {
  title: string;
  story: string;
  units: number;
  seconds: number;
  depts: Dept[];
}

const UNIT_VALUE = 25000;
const PASS_EFFICIENCY = 0.75;

const ROUNDS: Round[] = [
  {
    title: "Round 1 -- The Marketing Machine",
    story:
      "You have 8 units of ₹25,000. Marketing looks amazing on the first rupee. Watch what the 'Next unit adds' meter does as you keep feeding it.",
    units: 8,
    seconds: 30,
    depts: [
      { label: "Marketing", blurb: "Huge early buzz, saturates fast.", max: 100, k: 0.6, color: "#f59e0b" },
      { label: "R&D", blurb: "Slow burn, keeps paying off.", max: 90, k: 0.22, color: "#06b6d4" },
      { label: "Cybersecurity", blurb: "Steady, moderate returns.", max: 70, k: 0.3, color: "#10b981" },
    ],
  },
  {
    title: "Round 2 -- The Shiny Trap",
    story:
      "Four departments, 10 units of ₹25,000, less time. One of them has a spectacular first unit and then dries up. Spot the trap.",
    units: 10,
    seconds: 25,
    depts: [
      { label: "Brand Blitz", blurb: "Spectacular first unit... then nothing.", max: 120, k: 0.85, color: "#f59e0b" },
      { label: "Talent", blurb: "Moderate and durable.", max: 85, k: 0.3, color: "#a855f7" },
      { label: "Automation", blurb: "Slow start, big ceiling.", max: 110, k: 0.17, color: "#3b82f6" },
      { label: "Legal Shield", blurb: "Small ceiling, quick to cap out.", max: 40, k: 0.5, color: "#f43f5e" },
    ],
  },
  {
    title: "Round 3 -- Final Assessment: The Board Is Watching",
    story:
      "12 units of ₹25,000, 20 seconds, curves that are close to each other. Trust the marginal yield meters, not your gut.",
    units: 12,
    seconds: 20,
    depts: [
      { label: "Expansion", blurb: "Strong start, fades.", max: 105, k: 0.5, color: "#06b6d4" },
      { label: "Cybersecurity", blurb: "Reliable.", max: 80, k: 0.28, color: "#10b981" },
      { label: "Hiring", blurb: "Gentle curve, high ceiling.", max: 115, k: 0.2, color: "#a855f7" },
      { label: "Marketing", blurb: "Flashy, saturates fast.", max: 95, k: 0.65, color: "#f59e0b" },
    ],
  },
];

// Diminishing returns curve: Y(u) = max * (1 - e^(-k * u))
function output(dept: Dept, units: number): number {
  return dept.max * (1 - Math.exp(-dept.k * units));
}

// Marginal output of the NEXT unit given current unit count
function marginal(dept: Dept, currentUnits: number): number {
  return output(dept, currentUnits + 1) - output(dept, currentUnits);
}

// Optimal allocation via greedy marginal yield allocation
function optimalScore(round: Round): number {
  const depts = round.depts;
  const alloc = new Array(depts.length).fill(0);
  for (let u = 0; u < round.units; u++) {
    let bestIdx = 0;
    let bestMarginal = -1;
    for (let i = 0; i < depts.length; i++) {
      const m = marginal(depts[i], alloc[i]);
      if (m > bestMarginal) {
        bestMarginal = m;
        bestIdx = i;
      }
    }
    alloc[bestIdx]++;
  }
  return alloc.reduce((sum, count, idx) => sum + output(depts[idx], count), 0);
}

interface DiminishingReturnsLabProps {
  onComplete: () => void;
}

export function DiminishingReturnsLab({ onComplete }: DiminishingReturnsLabProps) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [phase, setPhase] = useState<"briefing" | "playing" | "debrief" | "mastered">("briefing");
  const round = ROUNDS[roundIdx];

  const [alloc, setAlloc] = useState<number[]>(() => new Array(round.depts.length).fill(0));
  const [secondsLeft, setSecondsLeft] = useState(round.seconds);

  const resetRound = useCallback((idx: number) => {
    setRoundIdx(idx);
    setAlloc(new Array(ROUNDS[idx].depts.length).fill(0));
    setSecondsLeft(ROUNDS[idx].seconds);
    setPhase("playing");
  }, []);

  const totalAllocated = useMemo(() => alloc.reduce((a, b) => a + b, 0), [alloc]);
  const remaining = round.units - totalAllocated;

  // Countdown timer during "playing" phase
  useEffect(() => {
    if (phase !== "playing") return;
    if (secondsLeft <= 0) {
      soundManager.playAlert();
      setPhase("debrief");
      return;
    }
    const timer = setInterval(() => {
      setSecondsLeft((s) => s - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, secondsLeft]);

  // If all units are allocated, proceed to debrief
  useEffect(() => {
    if (phase === "playing" && remaining === 0) {
      soundManager.playSuccess();
      setPhase("debrief");
    }
  }, [phase, remaining]);

  const addUnit = (deptIdx: number) => {
    if (remaining <= 0 || phase !== "playing") return;
    soundManager.playClick();
    setAlloc((prev) => {
      const next = [...prev];
      next[deptIdx] = (next[deptIdx] || 0) + 1;
      return next;
    });
  };

  const removeUnit = (deptIdx: number) => {
    if (phase !== "playing") return;
    if ((alloc[deptIdx] || 0) <= 0) return;
    soundManager.playClick();
    setAlloc((prev) => {
      const next = [...prev];
      next[deptIdx] = Math.max(0, next[deptIdx] - 1);
      return next;
    });
  };

  // Score calculations
  const totalScore = useMemo(() => {
    return alloc.reduce((sum, count, idx) => sum + output(round.depts[idx], count), 0);
  }, [alloc, round]);

  const maxPossible = useMemo(() => optimalScore(round), [round]);
  const efficiency = maxPossible > 0 ? Math.round((totalScore / maxPossible) * 100) : 0;
  const passed = efficiency >= PASS_EFFICIENCY * 100;

  // Educational debrief text
  const debriefText = useMemo(() => {
    if (phase !== "debrief") return "";
    if (remaining > 0) {
      return `Time ran out with ${remaining} unit${remaining > 1 ? "s" : ""} (₹${(
        remaining * UNIT_VALUE
      ).toLocaleString()}) unallocated. Idle capital delivers zero return.`;
    }
    let weakest = -1;
    let weakestGain = Infinity;
    alloc.forEach((u, idx) => {
      if (u > 0) {
        const g = marginal(round.depts[idx], u - 1);
        if (g < weakestGain) {
          weakestGain = g;
          weakest = idx;
        }
      }
    });
    let strongest = -1;
    let strongestGain = -1;
    alloc.forEach((u, idx) => {
      const g = marginal(round.depts[idx], u);
      if (g > strongestGain) {
        strongestGain = g;
        strongest = idx;
      }
    });
    if (weakest >= 0 && strongest >= 0 && strongestGain > weakestGain * 1.15) {
      return `Your last unit in ${round.depts[weakest].label} added only +${weakestGain.toFixed(
        1
      )}, while ${round.depts[strongest].label} would have added +${strongestGain.toFixed(
        1
      )}. That gap is what ignoring diminishing returns costs you.`;
    }
    return "Your last unit in every department was earning about the same. That is what an efficient allocation looks like: no unit is wasted where another would do better.";
  }, [phase, remaining, alloc, round]);

  const handleNext = () => {
    soundManager.playSuccess();
    if (roundIdx < ROUNDS.length - 1) {
      resetRound(roundIdx + 1);
    } else {
      setPhase("mastered");
    }
  };

  // ---------- 1. BRIEFING SCREEN ----------
  if (phase === "briefing") {
    return (
      <div className="rounded-2xl border border-cyan-800/60 bg-gradient-to-br from-neutral-950 via-cyan-950/20 to-neutral-950 p-8 md:p-12 text-center space-y-6 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-950/60 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-cyan-300">
          <Target className="h-4 w-4" /> Operations Onboarding Protocol
        </div>
        <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
          FINANCE &amp; OPERATIONS
          <br />
          <span className="text-cyan-400">TRAINING SIMULATION</span>
        </h2>
        <p className="text-base text-neutral-300 max-w-2xl mx-auto leading-relaxed">
          Before you manage real corporate capital, prove you understand{" "}
          <strong className="text-white">Diminishing Marginal Returns</strong>. Every ₹25,000 unit
          poured into a single department yields less and less additional output.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-left pt-2">
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <span className="text-xs font-mono text-cyan-400 font-bold">01. ALLOCATE UNITS</span>
            <p className="text-xs text-neutral-400 mt-1">
              Distribute ₹25,000 blocks across competing sectors before the clock runs out.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <span className="text-xs font-mono text-amber-400 font-bold">02. WATCH THE METERS</span>
            <p className="text-xs text-neutral-400 mt-1">
              Observe the &quot;Next unit adds&quot; meter drop as you concentrate capital.
            </p>
          </div>
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-4">
            <span className="text-xs font-mono text-emerald-400 font-bold">03. HIT 75% YIELD</span>
            <p className="text-xs text-neutral-400 mt-1">
              Balance allocations to achieve optimal portfolio efficiency and unlock real finance.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            soundManager.playSuccess();
            setPhase("playing");
          }}
          className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-lg font-bold text-white shadow-xl shadow-cyan-950/50 hover:from-cyan-400 hover:to-blue-500 transition"
        >
          [ BEGIN SIMULATION ] <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  // ---------- 2. MASTERED COMPLETION SCREEN ----------
  if (phase === "mastered") {
    return (
      <div className="rounded-2xl border border-emerald-500/60 bg-gradient-to-br from-emerald-950/40 via-neutral-950 to-neutral-950 p-10 text-center space-y-6 shadow-2xl">
        <Trophy className="h-16 w-16 text-amber-300 mx-auto" />
        <div className="space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
            SIMULATION COMPLETE
          </span>
          <h2 className="text-3xl font-extrabold text-white">
            Concept Mastered: Diminishing Marginal Returns
          </h2>
        </div>
        <p className="text-base text-neutral-200 max-w-2xl mx-auto leading-relaxed">
          You understand the principle: each extra rupee into the same department earns less than
          the one before it. Executive financial controls are now unlocked.
        </p>
        <button
          onClick={() => {
            soundManager.playSuccess();
            onComplete();
          }}
          className="inline-flex items-center gap-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-8 py-4 text-lg font-bold text-white shadow-xl hover:from-emerald-400 hover:to-teal-500 transition"
        >
          [ ENTER FINANCE ] <ArrowRight className="h-5 w-5" />
        </button>
      </div>
    );
  }

  const scaleMax = Math.max(...round.depts.map((d) => output(d, round.units)));

  // ---------- 3. PLAYING & DEBRIEF SCREEN ----------
  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-cyan-900/60 bg-neutral-950 p-5">
        <div className="space-y-1">
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-400">
            Economics Lab -- Diminishing Marginal Returns
          </div>
          <h2 className="text-xl font-extrabold text-white">{round.title}</h2>
          <p className="text-xs text-neutral-300 max-w-xl">{round.story}</p>
        </div>

        <div className="flex items-center gap-4">
          {phase === "playing" && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-500/50 bg-amber-950/30 px-4 py-2 font-mono text-amber-300">
              <Timer className="h-4 w-4 animate-spin" />
              <span className="text-lg font-bold">{secondsLeft}s</span>
            </div>
          )}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
              Capital Pool
            </div>
            <div className="font-mono text-lg font-extrabold text-cyan-300">
              {remaining} <span className="text-xs text-neutral-400">/ {round.units} units</span>
            </div>
            <div className="text-[10px] font-mono text-neutral-500">
              (₹{UNIT_VALUE.toLocaleString()} / unit)
            </div>
          </div>
        </div>
      </div>

      {/* Department Allocation Grid */}
      <div
        className={`grid gap-4 ${
          round.depts.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
        }`}
      >
        {round.depts.map((dept, idx) => {
          const currentUnits = alloc[idx] || 0;
          const currentOut = output(dept, currentUnits);
          const nextGain = marginal(dept, currentUnits);
          const barHeight = Math.min(100, Math.round((currentOut / scaleMax) * 100));

          return (
            <div
              key={dept.label}
              className="flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/80 p-5 space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">{dept.label}</h3>
                  <span className="text-xs font-mono text-neutral-400">{currentUnits} units</span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">{dept.blurb}</p>

                {/* Live Output Bar */}
                <div className="mt-4 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-neutral-400">Output Yield</span>
                    <span className="text-white font-bold">{currentOut.toFixed(1)}</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                    <div
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${barHeight}%`,
                        backgroundColor: dept.color,
                      }}
                    />
                  </div>
                </div>

                {/* Marginal Return Meter */}
                <div className="mt-3 rounded-lg border border-neutral-800/80 bg-neutral-950 p-2.5 space-y-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span className="text-neutral-400">Next ₹25K unit adds:</span>
                    <span
                      className={`font-bold ${
                        nextGain < 5
                          ? "text-rose-400"
                          : nextGain < 12
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      +{nextGain.toFixed(1)}
                    </span>
                  </div>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    {currentUnits === 0
                      ? "First rupee: Maximum impact"
                      : nextGain < 8
                      ? "⚠️ Steep diminishing returns"
                      : "Moderate marginal gain"}
                  </div>
                </div>
              </div>

              {/* Unit Controls */}
              {phase === "playing" && (
                <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                  <button
                    onClick={() => removeUnit(idx)}
                    disabled={currentUnits <= 0}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-neutral-700 bg-neutral-800/80 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Minus className="h-3.5 w-3.5" /> -₹25K
                  </button>
                  <button
                    onClick={() => addUnit(idx)}
                    disabled={remaining <= 0}
                    className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-cyan-500/60 bg-cyan-950/60 py-2 text-xs font-bold text-cyan-300 hover:bg-cyan-900/60 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Plus className="h-3.5 w-3.5" /> +₹25K
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Debrief Modal/Banner */}
      {phase === "debrief" && (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-800 pb-4">
            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                Round Assessment
              </span>
              <h3 className="text-xl font-bold text-white">
                Allocative Efficiency:{" "}
                <span className={passed ? "text-emerald-400" : "text-amber-400"}>
                  {efficiency}%
                </span>{" "}
                <span className="text-xs font-normal text-neutral-400">
                  (Goal: {Math.round(PASS_EFFICIENCY * 100)}%)
                </span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => resetRound(roundIdx)}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-2 text-xs font-bold text-neutral-200 hover:bg-neutral-700 transition"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Retry Round
              </button>
              {passed ? (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500 transition"
                >
                  {roundIdx < ROUNDS.length - 1 ? "Next Round" : "Complete Training"}{" "}
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => resetRound(roundIdx)}
                  className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-500 transition"
                >
                  Must Hit 75% to Advance
                </button>
              )}
            </div>
          </div>

          <p className="text-xs font-mono text-neutral-300 leading-relaxed">{debriefText}</p>
        </div>
      )}
    </div>
  );
}
