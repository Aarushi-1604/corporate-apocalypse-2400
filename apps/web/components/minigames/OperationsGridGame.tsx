"use client";

import { useState } from "react";
import { MiniGameShell } from "./framework/MiniGameShell";
import { MiniGameConfig } from "@/types/minigames";
import { soundManager } from "@/lib/audio";
import {
  Zap,
  TrendingUp,
  ShieldAlert,
  Sliders,
  DollarSign,
  Lock,
  RotateCcw,
  Sparkles,
} from "lucide-react";

const CATEGORY_GROUPS = [
  {
    name: "Growth & Innovation",
    color: "from-blue-600/20 to-cyan-600/20 border-cyan-500/40 text-cyan-400",
    items: [
      { key: "marketing", label: "Marketing & Brand", icon: TrendingUp },
      { key: "rnd", label: "R&D & Product", icon: Sparkles },
      { key: "expansion", label: "Market Expansion", icon: Zap },
      { key: "patents", label: "IP & Patents", icon: Sparkles },
    ],
  },
  {
    name: "Infrastructure & Security",
    color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/40 text-emerald-400",
    items: [
      { key: "cybersecurity", label: "Cybersecurity & IT", icon: ShieldAlert },
      { key: "automation", label: "Ops Automation", icon: Sliders },
      { key: "supply_chain", label: "Supply Chain", icon: Sliders },
      { key: "manufacturing", label: "Manufacturing Facilities", icon: Sliders },
    ],
  },
  {
    name: "Human Capital & Governance",
    color: "from-purple-600/20 to-indigo-600/20 border-purple-500/40 text-purple-400",
    items: [
      { key: "hiring", label: "Talent Acquisition", icon: Sliders },
      { key: "legal", label: "Legal & Compliance", icon: Sliders },
      { key: "carbon_reduction", label: "ESG & Carbon Reduction", icon: Sliders },
      { key: "insurance", label: "Risk Insurance", icon: Sliders },
    ],
  },
];

interface OperationsGridGameProps {
  availableCapital: number;
  initialAmounts: Record<string, number>;
  onSaveAmounts: (amounts: Record<string, number>) => void;
  onLockDecisions: () => Promise<void>;
  locking: boolean;
  lockingError: string | null;
}

export function OperationsGridGame({
  availableCapital,
  initialAmounts,
  onSaveAmounts,
  onLockDecisions,
  locking,
  lockingError,
}: OperationsGridGameProps) {
  const [amounts, setAmounts] = useState<Record<string, number>>(initialAmounts);

  const totalSpent = Object.values(amounts).reduce((sum, v) => sum + (v || 0), 0);
  const remainingBudget = availableCapital - totalSpent;
  const isOverBudget = remainingBudget < 0;

  const handleSliderChange = (category: string, value: number) => {
    soundManager.playHover();
    const updated = { ...amounts, [category]: value };
    setAmounts(updated);
    onSaveAmounts(updated);
  };

  const applyPreset = (presetType: "growth" | "defensive" | "balanced" | "reset") => {
    soundManager.playClick();
    const newAmounts: Record<string, number> = {};
    const categories = [
      "marketing", "rnd", "hiring", "layoffs", "automation", "cybersecurity",
      "legal", "supply_chain", "manufacturing", "expansion", "loans",
      "dividends", "carbon_reduction", "pricing", "acquisitions", "patents", "insurance",
    ];

    if (presetType === "reset") {
      categories.forEach((cat) => (newAmounts[cat] = 0));
    } else if (presetType === "growth") {
      const share = availableCapital / 4;
      newAmounts["marketing"] = Math.floor(share);
      newAmounts["rnd"] = Math.floor(share);
      newAmounts["expansion"] = Math.floor(share);
      newAmounts["patents"] = Math.floor(share);
    } else if (presetType === "defensive") {
      const share = availableCapital / 4;
      newAmounts["cybersecurity"] = Math.floor(share);
      newAmounts["legal"] = Math.floor(share);
      newAmounts["insurance"] = Math.floor(share);
      newAmounts["automation"] = Math.floor(share);
    } else if (presetType === "balanced") {
      const activeCats = ["marketing", "rnd", "cybersecurity", "hiring", "automation"];
      const share = availableCapital / activeCats.length;
      activeCats.forEach((cat) => (newAmounts[cat] = Math.floor(share)));
    }

    setAmounts(newAmounts);
    onSaveAmounts(newAmounts);
  };

  const gameConfig: MiniGameConfig = {
    gameId: "operations_resource_grid",
    title: "Operations Command: Capital Reactor",
    subtitle: "Strategic Budget Balancing & Yield Optimization",
    briefing: {
      speaker: {
        name: "Elena Rostova",
        role: "Chief Operating Officer",
        colorTheme: "cyan",
        avatarIcon: "COO",
      },
      dialogueText:
        "Welcome to the Operations Grid, CEO. Every dollar allocated here directly controls our growth trajectory and vulnerability profile. Be wary of Diminishing Returns—over-investing in a single category yields shrinking marginal gains while starving other critical infrastructure.",
      concept: {
        title: "Diminishing Returns & Marginal Utility",
        category: "Operations",
        explanation:
          "In business management, increasing capital investment in a single department eventually yields smaller incremental returns (marginal utility). A balanced capital portfolio across R&D, Cybersecurity, and Marketing mitigates systemic risk.",
        takeawayKey: "DIMINISHING_RETURNS",
      },
      objectives: [
        "Balance strategic budget allocations without exceeding total available capital.",
        "Ensure Cybersecurity and R&D receive baseline funding to avoid Q2 crisis vulnerability.",
        "Lock in decisions before the quarter deadline.",
      ],
    },
    initialData: {},
    onComplete: async () => {
      await onLockDecisions();
    },
  };

  return (
    <MiniGameShell config={gameConfig}>
      {({ submitMission }) => (
        <div className="space-y-6">
          {/* Reactor Energy Gauge Header */}
          <div className="relative overflow-hidden rounded-xl border border-cyan-900/60 bg-gradient-to-r from-neutral-950 via-cyan-950/20 to-neutral-950 p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                    Available Capital Reactor
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span
                    className={`text-3xl font-extrabold font-mono tracking-tight ${
                      isOverBudget ? "text-rose-400 animate-pulse" : "text-cyan-300"
                    }`}
                  >
                    ${remainingBudget.toLocaleString()}
                  </span>
                  <span className="text-xs text-neutral-500 font-mono">
                    / ${availableCapital.toLocaleString()} Total Capital
                  </span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-neutral-400 font-mono mr-1">Presets:</span>
                <button
                  onClick={() => applyPreset("growth")}
                  className="px-2.5 py-1 text-xs rounded border border-cyan-700/60 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/60 transition font-mono"
                >
                  Aggressive Growth
                </button>
                <button
                  onClick={() => applyPreset("defensive")}
                  className="px-2.5 py-1 text-xs rounded border border-emerald-700/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 transition font-mono"
                >
                  Defensive Shield
                </button>
                <button
                  onClick={() => applyPreset("balanced")}
                  className="px-2.5 py-1 text-xs rounded border border-purple-700/60 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 transition font-mono"
                >
                  Balanced
                </button>
                <button
                  onClick={() => applyPreset("reset")}
                  className="p-1 text-xs rounded border border-neutral-800 text-neutral-400 hover:text-white transition"
                  title="Reset All"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Budget Bar */}
            <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-neutral-900 border border-neutral-800">
              <div
                className={`h-full transition-all duration-300 ${
                  isOverBudget
                    ? "bg-rose-500"
                    : totalSpent / availableCapital > 0.85
                    ? "bg-amber-400"
                    : "bg-cyan-400"
                }`}
                style={{
                  width: `${Math.min(100, (totalSpent / availableCapital) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Allocation Groups */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {CATEGORY_GROUPS.map((group) => (
              <div
                key={group.name}
                className={`rounded-xl border bg-neutral-900/50 p-4 space-y-4 ${group.color}`}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono border-b border-neutral-800/80 pb-2">
                  {group.name}
                </h3>

                <div className="space-y-3">
                  {group.items.map((item) => {
                    const currentVal = amounts[item.key] || 0;
                    const isHighAllocation = currentVal > availableCapital * 0.4;

                    return (
                      <div key={item.key} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-medium text-neutral-200">{item.label}</span>
                          <span className="font-mono text-neutral-400">
                            ${currentVal.toLocaleString()}
                          </span>
                        </div>

                        <input
                          type="range"
                          min={0}
                          max={availableCapital}
                          step={500}
                          value={currentVal}
                          onChange={(e) => handleSliderChange(item.key, Number(e.target.value))}
                          className="w-full accent-cyan-400 bg-neutral-800 h-1.5 rounded-lg cursor-pointer"
                        />

                        {isHighAllocation && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-400 font-mono">
                            <ShieldAlert className="h-3 w-3" /> Diminishing return threshold active
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {lockingError && (
            <div className="rounded-lg border border-rose-500/60 bg-rose-950/40 p-3 text-xs text-rose-300">
              {lockingError}
            </div>
          )}

          {/* Lock Action Button */}
          <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
            <span className="text-xs text-neutral-400 font-mono">
              {isOverBudget ? "⚠️ Over budget! Reduce spending to lock." : "Ready to commit budget allocation."}
            </span>

            <button
              onClick={() => submitMission(amounts)}
              disabled={isOverBudget || locking}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <Lock className="h-4 w-4" />
              {locking ? "Engaging Lock..." : "Lock In Operations"}
            </button>
          </div>
        </div>
      )}
    </MiniGameShell>
  );
}
