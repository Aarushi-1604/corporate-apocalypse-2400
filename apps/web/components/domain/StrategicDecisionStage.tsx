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
  onReturnToHQ: () => void;
  existingResult?: DecisionResult | null;
  isAlreadyCommitted?: boolean;
}

export function StrategicDecisionStage({
  dilemma,
  quarter,
  companyId,
  onDecisionExecuted,
  onReturnToHQ,
  existingResult = null,
  isAlreadyCommitted = false,
}: StrategicDecisionStageProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    existingResult?.option_id ?? null
  );
  const [committedResult, setCommittedResult] = useState<DecisionResult | null>(
    existingResult
  );
  const executeMutation = useExecuteMarketDecision(companyId);

  const selectedOption = dilemma.options.find((o) => o.id === selectedOptionId);

  const handleSelect = (id: string) => {
    if (committedResult || isAlreadyCommitted) return;
    setSelectedOptionId(id);
    soundManager.playHover();
  };

  const handleCommit = async () => {
    if (!selectedOptionId || committedResult || isAlreadyCommitted || executeMutation.isPending) return;
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
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-2">
      {/* Header Cluster */}
      <div className="market-content-cluster !m-0">
        <div className="market-cluster-header">
          <div className="market-cluster-header-left">
            <div className="market-cluster-accent-bar" />
            <div>
              <h2 className="market-cluster-title">
                {dilemma.headline}
              </h2>
              <span className="market-cluster-subline">
                EXECUTIVE BRIEF // STRATEGIC DIRECTIVE // Q0{quarter} DECISION MANDATE
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] text-red-400 bg-red-950/60 border border-red-500/40 px-3 py-1 font-bold">
            STAGE 03 // MANDATE
          </span>
        </div>

        <div className="market-cluster-body">
          <p className="text-slate-300 text-xs font-mono leading-relaxed m-0 p-3.5 bg-black/70 border border-slate-800">
            {dilemma.context_brief}
          </p>

          <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>
              {committedResult || isAlreadyCommitted
                ? "QUARTERLY STRATEGIC ACTION COMMITTED. READ-ONLY ARCHIVE."
                : "EVALUATE 4 STRATEGIC OPTIONS. THIS DECISION COMMITS REAL CORPORATE CAPITAL."}
            </span>
            {Boolean(committedResult || isAlreadyCommitted) && (
              <button
                type="button"
                onClick={onReturnToHQ}
                className="text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                RETURN TO HQ →
              </button>
            )}
          </div>
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
              className={`p-4 border flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? "border-red-500 bg-red-950/25 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                  : "border-slate-800/90 bg-neutral-950/80 hover:border-slate-700 hover:bg-neutral-900/90"
              } ${(committedResult || isAlreadyCommitted) && !isSelected ? "opacity-35 pointer-events-none" : ""}`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest text-red-400 font-bold uppercase">
                    STRATEGIC MANDATE
                  </span>
                  <span className="font-mono text-[11px] font-bold text-slate-300">
                    COST: {option.cost_cash > 0 ? `₹${option.cost_cash.toLocaleString()}` : "₹0 (RESERVE)"}
                  </span>
                </div>

                <h3 className="text-sm font-bold font-sans text-white tracking-wide m-0">
                  {option.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-sans m-0">
                  {option.description}
                </p>

                <div className="mt-2 p-2.5 bg-black/70 border border-slate-800 text-[10px] font-mono flex flex-col gap-0.5">
                  <span className="text-amber-400 font-bold">PROJECTED TRADEOFF:</span>
                  <span className="text-slate-300">{option.tradeoff}</span>
                </div>
              </div>

              {/* KPI Impact Preview */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5 text-[9px] font-mono">
                {Object.entries(option.stat_deltas).map(([kpi, val]) => (
                  <span
                    key={kpi}
                    className={`px-2 py-0.5 font-bold ${
                      val > 0
                        ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                        : "bg-red-950/60 text-red-300 border border-red-500/40"
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
        <div className="p-3 bg-red-950/40 border border-red-500 text-red-400 text-xs font-mono">
          ERROR COMMITTING STRATEGIC DIRECTIVE: {executeMutation.error.message}
        </div>
      )}

      {/* Committed Results & Consequence Screen */}
      {committedResult ? (
        <div className="border border-emerald-500/40 bg-neutral-950 p-5 flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase">
                DIRECTIVE RATIFIED // STATE DELTAS COMMITTED
              </span>
              <h3 className="text-lg font-bold font-sans text-white mt-1 m-0">
                {committedResult.press_headline}
              </h3>
            </div>
            <span className="px-2.5 py-1 bg-emerald-950/60 border border-emerald-500 text-[10px] font-mono text-emerald-400 font-bold">
              COMMITTED TO RECORD
            </span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed font-mono m-0">
            {committedResult.press_body}
          </p>

          {/* New Company State Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-black border border-slate-800 font-mono text-xs">
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">NEW LIQUID CASH</span>
              <strong className="text-sm font-bold text-amber-400">
                ₹{committedResult.new_cash.toLocaleString()}
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">NEW MARKET SHARE</span>
              <strong className="text-sm font-bold text-white">
                {committedResult.new_market_share.toFixed(1)}%
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">BRAND PRESTIGE</span>
              <strong className="text-sm font-bold text-white">
                {committedResult.new_brand.toFixed(1)} pts
              </strong>
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] text-slate-400">SYSTEMIC RISK</span>
              <strong className="text-sm font-bold text-slate-200">
                {committedResult.new_risk.toFixed(1)} pts
              </strong>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-mono text-emerald-400">
              DISPATCH TRANSMITTED TO THE CORPORATE TIMES WIRE // QUARTERLY ACTION LOCKED
            </span>
            <button
              type="button"
              onClick={onReturnToHQ}
              className="game-button gold px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
            >
              <span>RETURN TO HQ →</span>
            </button>
          </div>
        </div>
      ) : isAlreadyCommitted ? (
        <div className="flex items-center justify-between p-4 border border-emerald-500/40 bg-neutral-950 font-mono text-xs">
          <span className="text-emerald-400">
            STRATEGIC DIRECTIVE RATIFIED FOR QUARTER 0{quarter} // ACTION COMPLETED
          </span>
          <button
            type="button"
            onClick={onReturnToHQ}
            className="game-button gold px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
          >
            <span>RETURN TO HQ →</span>
          </button>
        </div>
      ) : (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={!selectedOptionId || executeMutation.isPending}
            onClick={handleCommit}
            className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest disabled:opacity-40 cursor-pointer"
          >
            <span>
              {executeMutation.isPending
                ? "TRANSMITTING EXECUTIVE ORDER..."
                : `COMMIT DIRECTIVE ${selectedOption ? `(₹${selectedOption.cost_cash.toLocaleString()})` : ""}`}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
