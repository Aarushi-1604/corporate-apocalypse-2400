"use client";

import { soundManager } from "@/lib/audio";
import { TrendingUp, TrendingDown, Minus, ShieldAlert, Award } from "lucide-react";

type KpiCardProps = {
  label: string;
  value: string | number;
  delta?: number;
  previousValue?: string | number;
};

export function KpiCard({ label, value, delta, previousValue }: KpiCardProps) {
  const showDelta = delta !== undefined && Math.abs(delta) > 0.01;
  const isUp = (delta ?? 0) > 0;
  const numValue = typeof value === "number" ? value : parseFloat(value) || 0;

  // Determine Game Stat Tier
  let tier = "STABLE";
  let tierColor = "border-neutral-800 bg-neutral-900/60 text-neutral-300";

  if (label.toLowerCase().includes("cash") || label.toLowerCase().includes("stock")) {
    if (numValue > 500000 || numValue > 100) {
      tier = "RANK S";
      tierColor = "border-amber-500/50 bg-amber-950/20 text-amber-300";
    } else if (numValue < 50000 || numValue < 15) {
      tier = "CRITICAL";
      tierColor = "border-rose-500/60 bg-rose-950/30 text-rose-300 animate-pulse";
    }
  } else if (label.toLowerCase().includes("satisfaction") || label.toLowerCase().includes("confidence")) {
    if (numValue >= 75) {
      tier = "HIGH ALIGNMENT";
      tierColor = "border-emerald-500/50 bg-emerald-950/20 text-emerald-300";
    } else if (numValue < 40) {
      tier = "ALERT";
      tierColor = "border-rose-500/60 bg-rose-950/30 text-rose-300";
    }
  } else if (label.toLowerCase().includes("risk")) {
    if (numValue > 60) {
      tier = "HIGH VULNERABILITY";
      tierColor = "border-rose-500/60 bg-rose-950/30 text-rose-300 animate-pulse";
    }
  }

  const handleHover = () => {
    soundManager.playHover();
  };

  return (
    <div
      onMouseEnter={handleHover}
      className={`group relative overflow-hidden rounded-xl border p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg ${tierColor}`}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wider font-mono text-neutral-400">
          {label}
        </p>
        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded border border-neutral-700/60 bg-neutral-950/80 font-bold uppercase">
          {tier}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <p className="text-2xl font-extrabold font-mono tracking-tight text-white group-hover:text-cyan-300 transition">
          {value}
        </p>

        {showDelta && (
          <div
            className={`flex items-center gap-1 text-xs font-bold font-mono px-2 py-0.5 rounded border ${
              isUp
                ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-400"
                : "border-rose-500/50 bg-rose-950/40 text-rose-400"
            }`}
          >
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>
              {isUp ? "+" : "-"}
              {Math.abs(delta!).toFixed(1)}
            </span>
          </div>
        )}
      </div>

      {previousValue !== undefined && (
        <div className="mt-2 flex items-center justify-between pt-2 border-t border-neutral-800/60 text-[10px] text-neutral-400 font-mono">
          <span>Previous: {previousValue}</span>
          <span className="text-neutral-500">→ Current</span>
        </div>
      )}
    </div>
  );
}