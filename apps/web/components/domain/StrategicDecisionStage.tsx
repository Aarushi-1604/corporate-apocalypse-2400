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
  currentCash?: number;
}

export function StrategicDecisionStage({
  dilemma,
  quarter,
  companyId,
  onDecisionExecuted,
  onReturnToHQ,
  existingResult = null,
  isAlreadyCommitted = false,
  currentCash,
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
    <div className="flex flex-col gap-6 w-full py-2">
      {/* Header Cluster */}
      <div className="market-content-cluster !m-0 !max-w-none w-full">
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
          <p className="text-slate-200 text-sm md:text-base font-mono leading-relaxed m-0 p-4 bg-black/70 border border-slate-800">
            {dilemma.context_brief}
          </p>

          <div className="pt-2 flex items-center justify-between text-xs font-mono text-slate-400">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {dilemma.options.map((option) => {
          const isSelected = selectedOptionId === option.id;

          return (
            <div
              key={option.id}
              onClick={() => handleSelect(option.id)}
              className={`p-6 border flex flex-col justify-between transition-all cursor-pointer ${
                isSelected
                  ? "border-red-500 bg-red-950/25 shadow-[0_0_20px_rgba(239,68,68,0.25)]"
                  : "border-slate-800/90 bg-neutral-950/80 hover:border-slate-700 hover:bg-neutral-900/90"
              } ${(committedResult || isAlreadyCommitted) && !isSelected ? "opacity-35 pointer-events-none" : ""}`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono tracking-widest text-red-400 font-bold uppercase">
                    STRATEGIC MANDATE
                  </span>
                  <div className="flex items-center gap-2">
                    {currentCash !== undefined && option.cost_cash > currentCash && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-950/80 border border-red-500/50 px-1.5 py-0.5 font-bold animate-pulse">
                        INSOLVENCY RISK
                      </span>
                    )}
                    <span className={`font-mono text-sm font-bold ${currentCash !== undefined && option.cost_cash > currentCash ? "text-red-400" : "text-slate-200"}`}>
                      COST: {option.cost_cash > 0 ? `₹${option.cost_cash.toLocaleString()}` : "₹0 (RESERVE)"}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-bold font-sans text-white tracking-wide m-0">
                  {option.title}
                </h3>
                <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans m-0">
                  {option.description}
                </p>

                <div className="mt-2.5 p-3.5 bg-black/70 border border-slate-800 text-xs md:text-sm font-mono flex flex-col gap-1">
                  <span className="text-amber-400 font-bold">PROJECTED TRADEOFF:</span>
                  <span className="text-slate-200">{option.tradeoff}</span>
                </div>
              </div>

              {/* KPI Impact Preview */}
              <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs font-mono">
                {Object.entries(option.stat_deltas).map(([kpi, val]) => (
                  <span
                    key={kpi}
                    className={`px-3 py-1 font-bold ${
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
        committedResult.bankruptcy || committedResult.status === "bankrupt" ? (
          <div className="border-2 border-red-500 bg-neutral-950 p-6 flex flex-col gap-4 animate-in fade-in duration-300 shadow-[0_0_35px_rgba(239,68,68,0.4)]">
            <div className="flex items-center justify-between pb-3 border-b border-red-900/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-red-950 border border-red-500 flex items-center justify-center text-red-400 font-bold text-lg">
                  ⚠
                </div>
                <div>
                  <span className="text-[11px] font-mono tracking-widest text-red-400 font-bold uppercase">
                    CORPORATE INSOLVENCY PROCEEDINGS // RUN TERMINATED
                  </span>
                  <h3 className="text-xl font-bold font-sans text-red-100 mt-0.5 m-0">
                    {committedResult.press_headline}
                  </h3>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-950 border border-red-500 text-xs font-mono text-red-400 font-bold">
                BANKRUPT // RUN OVER
              </span>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed font-mono m-0 bg-red-950/20 border border-red-950 p-4">
              {committedResult.press_body}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-black border border-red-900/60 font-mono text-xs">
              <div className="flex flex-col">
                <span className="text-[9px] text-red-400 font-bold">TERMINAL LIQUID CASH</span>
                <strong className="text-base font-bold text-red-500">
                  ₹{committedResult.new_cash.toLocaleString()} (DEFICIT)
                </strong>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400">FINAL MARKET SHARE</span>
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
                <strong className="text-sm font-bold text-red-400">
                  {committedResult.new_risk.toFixed(1)} pts
                </strong>
              </div>
            </div>

            <div className="p-3 bg-red-950/40 border border-red-500/50 text-red-300 text-xs font-mono">
              Cash reserves have been exhausted below zero. Operations cannot continue under your administration. The run is concluded and your score has been finalized in the corporate archives.
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.href = "/hq/reports/annual";
                }}
                className="game-button gold px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
              >
                <span>[ VIEW FINAL REPORT ]</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.href = "/hq/leaderboard";
                }}
                className="game-button px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer text-amber-400 border border-amber-500/50 bg-neutral-900 hover:bg-neutral-800"
              >
                <span>[ VIEW LEADERBOARD ]</span>
              </button>
            </div>
          </div>
        ) : (
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
        )
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
        <div className="flex flex-col gap-3 pt-2">
          {selectedOption && currentCash !== undefined && selectedOption.cost_cash > currentCash && (
            <div className="p-3 bg-red-950/80 border border-red-500 text-red-200 text-xs font-mono flex items-center gap-2.5 shadow-[0_0_15px_rgba(239,68,68,0.3)]">
              <span className="text-red-400 font-bold text-base">⚠️</span>
              <div className="flex flex-col">
                <span className="font-bold text-red-400 uppercase tracking-wider">
                  CRITICAL DEFICIT WARNING // IMMEDIATE INSOLVENCY MANDATE
                </span>
                <span>
                  Option requires ₹{selectedOption.cost_cash.toLocaleString()} against ₹{currentCash.toLocaleString()} available. Authorizing this directive will drive cash below zero (-₹{(selectedOption.cost_cash - currentCash).toLocaleString()}) and trigger immediate CORPORATE BANKRUPTCY &amp; TERMINATION.
                </span>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!selectedOptionId || executeMutation.isPending}
              onClick={handleCommit}
              className={`game-button ${selectedOption && currentCash !== undefined && selectedOption.cost_cash > currentCash ? "border-red-500 text-red-400 hover:bg-red-950/50" : "gold"} px-8 py-3 text-xs font-mono font-bold tracking-widest disabled:opacity-40 cursor-pointer`}
            >
              <span>
                {executeMutation.isPending
                  ? "TRANSMITTING EXECUTIVE ORDER..."
                  : selectedOption && currentCash !== undefined && selectedOption.cost_cash > currentCash
                  ? `AUTHORIZE MANDATE // TRIGGER BANKRUPTCY (₹${selectedOption.cost_cash.toLocaleString()})`
                  : `COMMIT DIRECTIVE ${selectedOption ? `(₹${selectedOption.cost_cash.toLocaleString()})` : ""}`}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
