"use client";

import { useState } from "react";
import {
  StrategicDilemma,
  DecisionOption,
  DecisionResult,
  useExecuteMarketDecision,
} from "@/lib/hooks/use-market";
import { soundManager } from "@/lib/audio";

interface StrategicDecisionStageProps {
  dilemma: StrategicDilemma;
  quarter: number;
  companyId: string;
  onDecisionExecuted: (result: DecisionResult) => void;
  onBackToIntel: () => void;
}

export function StrategicDecisionStage({
  dilemma,
  quarter,
  companyId,
  onDecisionExecuted,
  onBackToIntel,
}: StrategicDecisionStageProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [committedResult, setCommittedResult] = useState<DecisionResult | null>(null);
  const executeMutation = useExecuteMarketDecision(companyId);

  const selectedOption = dilemma.options.find((o) => o.id === selectedOptionId);

  const handleSelect = (id: string) => {
    if (committedResult) return;
    setSelectedOptionId(id);
    soundManager.playHover();
  };

  const handleCommit = async () => {
    if (!selectedOptionId || committedResult || executeMutation.isPending) return;
    soundManager.playClick();

    try {
      const result = await executeMutation.mutateAsync({
        quarter,
        dilemma_id: dilemma.id,
        option_id: selectedOptionId,
      });
      setCommittedResult(result);
      onDecisionExecuted(result);
      soundManager.playSuccess();
    } catch {
      soundManager.playAlert();
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-6">
      {/* Header & Dilemma Brief */}
      <div className="rounded-xl border border-red-500/40 bg-neutral-950/80 p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-red-500/10 border-b border-l border-red-500/30 font-mono text-xs text-red-400">
          STAGE 3 // STRATEGIC DIRECTIVE // WHAT WOULD YOU DO?
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-red-400/80 mb-2">
          <span>HIGH-STAKES CORPORATE DILEMMA</span>
          <span>•</span>
          <span>DIRECT STATE CONSEQUENCE</span>
        </div>

        <h2 className="text-2xl font-black tracking-wider text-white mb-3">
          {dilemma.headline}
        </h2>
        <p className="text-neutral-300 text-sm leading-relaxed max-w-3xl">
          {dilemma.context_brief}
        </p>

        <div className="mt-4 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>EVALUATE 4 STRATEGIC OPTIONS. THIS DECISION COMMITS REAL CORPORATE ASSETS.</span>
          <button
            type="button"
            onClick={onBackToIntel}
            className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
          >
            ← REVIEW MARKET INTELLIGENCE
          </button>
        </div>
      </div>

      {/* 4 Strategic Choices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dilemma.options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`p-5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? "border-amber-400 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900/90"
              } ${committedResult && !isSelected ? "opacity-40 pointer-events-none" : ""}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono tracking-widest text-amber-500 font-bold uppercase">
                    STRATEGY OPTION
                  </span>
                  <span className="font-mono text-xs font-bold text-neutral-300">
                    COST: {option.cost_cash > 0 ? `₹${option.cost_cash.toLocaleString()}` : "₹0 (RESERVE)"}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white tracking-wide">
                  {option.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {option.description}
                </p>

                <div className="mt-2 p-3 rounded bg-neutral-950/80 border border-neutral-800/80 text-[11px] font-mono flex flex-col gap-1">
                  <span className="text-amber-400/90 font-bold">TRADEOFF:</span>
                  <span className="text-neutral-300">{option.tradeoff}</span>
                </div>
              </div>

              {/* KPI Impact Preview */}
              <div className="mt-4 pt-3 border-t border-neutral-800/80 flex flex-wrap gap-2 text-[10px] font-mono">
                {Object.entries(option.stat_deltas).map(([kpi, val]) => (
                  <span
                    key={kpi}
                    className={`px-2 py-0.5 rounded font-bold ${
                      val > 0
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-red-500/10 text-red-400 border border-red-500/30"
                    }`}
                  >
                    {val > 0 ? `+${val}` : val} {kpi.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error Notice */}
      {executeMutation.isError && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/50 text-red-400 text-xs font-mono">
          ERROR COMMITTING STRATEGIC DIRECTIVE: {executeMutation.error.message}
        </div>
      )}

      {/* Committed Results & Consequence Screen */}
      {committedResult ? (
        <div className="rounded-xl border border-emerald-500/40 bg-neutral-950 p-6 flex flex-col gap-5 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div>
              <span className="text-xs font-mono tracking-widest text-emerald-400 font-bold">
                DECISION EXECUTED // DIRECT STATE CONSEQUENCES APPLIED
              </span>
              <h3 className="text-2xl font-black text-white mt-1">
                {committedResult.press_headline}
              </h3>
            </div>
            <span className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500 font-mono text-xs text-emerald-400 font-bold">
              COMMITTED TO RECORD
            </span>
          </div>

          <p className="text-sm text-neutral-300 leading-relaxed font-mono">
            {committedResult.press_body}
          </p>

          {/* New Company State Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-neutral-900/60 border border-neutral-800 font-mono text-xs">
            <div className="flex flex-col">
              <span className="text-neutral-500">NEW LIQUID CASH</span>
              <span className="text-base font-bold text-amber-400">
                ₹{committedResult.new_cash.toLocaleString()}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">NEW MARKET SHARE</span>
              <span className="text-base font-bold text-white">
                {committedResult.new_market_share.toFixed(1)}%
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">NEW BRAND PRESTIGE</span>
              <span className="text-base font-bold text-white">
                {committedResult.new_brand.toFixed(1)} pts
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-neutral-500">SYSTEMIC RISK</span>
              <span className="text-base font-bold text-neutral-200">
                {committedResult.new_risk.toFixed(1)} pts
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-neutral-400">
              DISPATCH TRANSMITTED TO THE CORPORATE TIMES WIRE
            </span>
            <button
              type="button"
              onClick={onBackToIntel}
              className="px-6 py-2.5 rounded bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold cursor-pointer"
            >
              RETURN TO RADAR
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={!selectedOptionId || executeMutation.isPending}
            onClick={handleCommit}
            className="px-8 py-3.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-black font-mono tracking-widest flex items-center gap-3 shadow-[0_0_25px_rgba(245,158,11,0.3)] disabled:opacity-40 cursor-pointer"
          >
            {executeMutation.isPending
              ? "TRANSMITTING EXECUTIVE ORDER..."
              : `COMMIT DIRECTIVE ${selectedOption ? `(₹${selectedOption.cost_cash.toLocaleString()})` : ""}`}
          </button>
        </div>
      )}
    </div>
  );
}
