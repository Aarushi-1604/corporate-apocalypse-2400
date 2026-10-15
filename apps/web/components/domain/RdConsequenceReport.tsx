"use client";

import { ExecuteRdDecisionResult } from "@/lib/hooks/use-rd";

interface RdConsequenceReportProps {
  result: ExecuteRdDecisionResult;
  quarter: number;
  onReturnToHQ: () => void;
}

export function RdConsequenceReport({
  result,
  quarter,
  onReturnToHQ,
}: RdConsequenceReportProps) {
  const isInvest = result.action_label === "INVEST" || result.option_id === "invest";

  return (
    <div className="flex flex-col gap-6 w-full py-2">
      <div className="rd-content-cluster !m-0 !max-w-none w-full">
        <div className="rd-cluster-header">
          <div className="market-cluster-header-left">
            <div className="rd-cluster-accent-bar" />
            <div>
              <h2 className="market-cluster-title">
                PROJECT GENESIS // DIRECTIVE EXECUTED
              </h2>
              <span className="market-cluster-subline">
                EXECUTIVE RESEARCH CONSEQUENCE REPORT • QUARTER 0{quarter}
              </span>
            </div>
          </div>
          <span className="px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40">
            Q0{quarter} DIRECTIVE RATIFIED
          </span>
        </div>

        <div className="market-cluster-body">
          {/* Action Taken Banner */}
          <div className="p-5 bg-black/80 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-mono text-slate-400 tracking-wider">
                RATIFIED MANDATE
              </span>
              <strong className="text-xl font-bold font-sans text-white">
                {result.option_title}
              </strong>
              <span className="text-xs font-mono text-cyan-400">
                ACTION: {result.action_label}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex flex-col items-end">
                <span className="text-xs font-mono text-slate-400">LIQUID TREASURY OUTFLOW</span>
                <strong className={`text-2xl font-bold font-mono ${result.cost_cash > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {result.cost_cash > 0 ? `-₹${result.cost_cash.toLocaleString()}` : "₹0 (PRESERVED)"}
                </strong>
              </div>
            </div>
          </div>

          {/* KPI Changes Summary Grid */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-mono text-slate-400 tracking-wider uppercase font-semibold">
              TELEMETRY IMPACT &amp; STATE REALIGNMENT:
            </span>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
              <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1">
                <span className="text-xs font-mono text-slate-400">UPDATED CASH</span>
                <strong className="text-xl font-bold font-mono text-white">
                  ₹{result.new_cash.toLocaleString()}
                </strong>
                <span className="text-[11px] font-mono text-amber-400">
                  {result.cost_cash > 0 ? `-₹${result.cost_cash.toLocaleString()}` : "0 CASH DELTA"}
                </span>
              </div>

              <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1">
                <span className="text-xs font-mono text-slate-400">INNOVATION RATING</span>
                <strong className="text-xl font-bold font-mono text-cyan-400">
                  {result.new_innovation.toFixed(1)}
                </strong>
                <span className="text-[11px] font-mono text-emerald-400">
                  {isInvest ? "+6.0 COMPONENT BOOST" : "UNCHANGED"}
                </span>
              </div>

              <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1">
                <span className="text-xs font-mono text-slate-400">ENTERPRISE RISK</span>
                <strong className="text-xl font-bold font-mono text-slate-200">
                  {result.new_risk.toFixed(1)}
                </strong>
                <span className={`text-[11px] font-mono ${isInvest ? "text-red-400" : "text-emerald-400"}`}>
                  {isInvest ? "+2.0 EXPERIMENTAL EXPOSURE" : "-1.0 CONSERVATIVE POSTURE"}
                </span>
              </div>

              <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1">
                <span className="text-xs font-mono text-slate-400">BOARD CONFIDENCE</span>
                <strong className="text-xl font-bold font-mono text-emerald-300">
                  {result.new_board_confidence.toFixed(1)}
                </strong>
                <span className="text-[11px] font-mono text-emerald-400">
                  {isInvest ? "+2.0 VISION ALIGNMENT" : "STABLE"}
                </span>
              </div>
            </div>
          </div>

          {/* Corporate Times Dispatch Feature */}
          <div className="p-6 border border-cyan-800/60 bg-black/90 flex flex-col gap-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                THE CORPORATE TIMES // CONFIRMED WIRE DISPATCH
              </span>
              <span className="text-xs font-mono text-slate-400">Q0{quarter} EDITION</span>
            </div>

            <h3 className="text-lg font-bold font-sans text-white tracking-wide m-0">
              {result.press_headline}
            </h3>

            <p className="text-sm font-sans text-slate-300 leading-relaxed m-0 border-l-2 border-cyan-400 pl-4 py-1 italic bg-cyan-950/20">
              “{result.press_body}”
            </p>
          </div>

          {/* Final Navigation Return to HQ */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-mono text-emerald-400 font-bold tracking-wide">
              ✓ Q1 R&amp;D DIRECTIVE // COMMITTED • SECTOR LOCKED UNTIL QUARTER COMPLETION
            </span>

            <button
              type="button"
              onClick={onReturnToHQ}
              className="game-button gold px-10 py-3.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
            >
              <span>RETURN TO HQ →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
