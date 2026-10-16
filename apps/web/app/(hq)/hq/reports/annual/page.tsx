"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import { useAnnualReport } from "@/lib/hooks/use-annual-report";

export default function AnnualReportPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: report, isLoading, isError } = useAnnualReport(session?.company_id);

  if (isLoading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="font-mono text-sm tracking-wider text-neutral-400">
          DECRYPTING AUTHORITATIVE ANNUAL AUDIT ARCHIVE...
        </p>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-950/10 p-8 text-center">
        <h2 className="font-mono text-lg font-bold text-red-400">ANNUAL REPORT LOCKED / NOT YET AVAILABLE</h2>
        <p className="mt-2 text-sm text-neutral-400">
          The Annual Executive Audit is finalized only upon conclusion of Quarter 4, company insolvency, or board dismissal.
        </p>
        <Link
          href="/hq"
          className="mt-6 inline-block rounded border border-neutral-700 bg-neutral-900 px-4 py-2 font-mono text-xs uppercase tracking-wider text-neutral-300 hover:bg-neutral-800"
        >
          ← Return to HQ Operations
        </Link>
      </div>
    );
  }

  const isSurvived = report.outcome === "SURVIVED";
  const isBankrupt = report.outcome === "BANKRUPT";
  const isFired = report.outcome === "FIRED";

  const outcomeColor = isSurvived
    ? "border-emerald-500/50 bg-emerald-950/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
    : isBankrupt
    ? "border-red-500/50 bg-red-950/30 text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
    : "border-amber-500/50 bg-amber-950/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.15)]";

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16 font-mono text-neutral-200">
      {/* Top Header Banner */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-6 md:flex-row md:items-end">
        <div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-emerald-500">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>SYMBITECH 2400 // FINAL EXECUTIVE AUDIT & GOVERNANCE REPORT</span>
          </div>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-white uppercase">
            {report.company_name || "CORPORATION"}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            CHIEF EXECUTIVE OFFICER: <span className="font-semibold text-neutral-200">{report.ceo_name || "Not recorded"}</span> | SECTOR:{" "}
            <span className="uppercase text-neutral-300">{report.sector || "General"}</span>
          </p>
        </div>

        <div className={`rounded-lg border px-5 py-3 text-center md:text-right ${outcomeColor}`}>
          <div className="text-[10px] tracking-widest uppercase text-neutral-400">MANDATE STATUS</div>
          <div className="text-2xl font-black tracking-wider">{report.outcome}</div>
        </div>
      </div>

      {/* Prominent Scorecard and Liquid Cash */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center shadow-lg backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-neutral-500">FINAL AUTHORITATIVE CEO SCORE</div>
          <div className="mt-3 text-6xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">
            {report.final_score.toFixed(1)}
          </div>
          <div className="mt-2 text-xs text-neutral-400">Normalized Index / 100.0 Scale</div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center shadow-lg backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-neutral-500">FINAL LIQUID CASH RESERVES</div>
          <div
            className={`mt-3 text-4xl font-black drop-shadow ${
              report.final_cash < 0 ? "text-red-400" : "text-neutral-100"
            }`}
          >
            ${report.final_cash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            {report.final_cash < 0 ? "TERMINAL DEFICIT // INSOLVENT" : "SOLVENT WORKING CAPITAL"}
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center shadow-lg backdrop-blur">
          <div className="text-xs uppercase tracking-wider text-neutral-500">BOARD CONFIDENCE AT CONCLUSION</div>
          <div className="mt-3 text-4xl font-black text-cyan-400">
            {(report.final_kpis?.board_confidence ?? 50).toFixed(1)}%
          </div>
          <div className="mt-2 text-xs text-neutral-400">
            {isFired ? "DISMISSED BELOW QUORUM" : "RATIFIED BY VOTING SHAREHOLDERS"}
          </div>
        </div>
      </div>

      {/* Score Breakdown Grid */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">EXECUTIVE SCORING MATRIX BREAKDOWN</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-7 text-center">
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Revenue</div>
            <div className="mt-1 text-lg font-bold text-neutral-200">
              {report.score_breakdown?.revenue_score?.toFixed(0) ?? report.revenue_score?.toFixed(0) ?? 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Profit</div>
            <div className="mt-1 text-lg font-bold text-neutral-200">
              {report.score_breakdown?.profit_score?.toFixed(0) ?? report.profit_score?.toFixed(0) ?? 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Satisfaction</div>
            <div className="mt-1 text-lg font-bold text-neutral-200">
              {report.score_breakdown?.satisfaction_score?.toFixed(0) ?? report.satisfaction_score?.toFixed(0) ?? 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Innovation</div>
            <div className="mt-1 text-lg font-bold text-neutral-200">
              {report.score_breakdown?.innovation_score?.toFixed(0) ?? report.innovation_score?.toFixed(0) ?? 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Investor</div>
            <div className="mt-1 text-lg font-bold text-neutral-200">
              {report.score_breakdown?.investor_score?.toFixed(0) ?? report.investor_score?.toFixed(0) ?? 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Survival</div>
            <div className="mt-1 text-lg font-bold text-neutral-200">
              {report.score_breakdown?.survival_score?.toFixed(0) ?? report.survival_score?.toFixed(0) ?? 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3">
            <div className="text-[10px] uppercase text-neutral-500">Risk Penalty</div>
            <div className="mt-1 text-lg font-bold text-red-400">
              -{report.score_breakdown?.risk_penalty?.toFixed(0) ?? report.risk_penalty?.toFixed(0) ?? 0}
            </div>
          </div>
        </div>
      </div>

      {/* Board Assessment */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">FINAL BOARD OF DIRECTORS ASSESSMENT</h2>
        <div className="mt-3 rounded border border-neutral-800 bg-neutral-950/80 p-4 font-sans text-sm leading-relaxed text-neutral-300">
          {report.final_board_assessment || "Not recorded"}
        </div>
      </div>

      {/* Final KPIs Table */}
      {report.final_kpis && Object.keys(report.final_kpis).length > 0 && (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
          <h2 className="text-xs uppercase tracking-wider text-neutral-400">TERMINAL METRICS & CORPORATE KPIS</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-6 text-sm">
            <div className="border-l-2 border-emerald-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Revenue</div>
              <div className="font-bold text-neutral-200">
                ${(report.final_kpis.revenue ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="border-l-2 border-emerald-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Profit</div>
              <div className="font-bold text-neutral-200">
                ${(report.final_kpis.profit ?? 0).toLocaleString()}
              </div>
            </div>
            <div className="border-l-2 border-cyan-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Stock Price</div>
              <div className="font-bold text-neutral-200">
                ${(report.final_kpis.stock_price ?? 0).toFixed(2)}
              </div>
            </div>
            <div className="border-l-2 border-cyan-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Market Share</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.market_share ?? 0).toFixed(1)}%
              </div>
            </div>
            <div className="border-l-2 border-purple-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Brand Equity</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.brand ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-purple-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">ESG Index</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.esg ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-yellow-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Client Sat.</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.client_satisfaction ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-yellow-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Staff Sat.</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.employee_satisfaction ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-blue-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Innovation</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.innovation ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-blue-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Investor Conf.</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.investor_confidence ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-red-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Risk Exposure</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.risk ?? 0).toFixed(1)}
              </div>
            </div>
            <div className="border-l-2 border-neutral-500 pl-3">
              <div className="text-[10px] uppercase text-neutral-500">Workforce</div>
              <div className="font-bold text-neutral-200">
                {(report.final_kpis.employees ?? 0).toLocaleString()} FTE
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Accepted Client Deals & Contract Outcomes */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">ACCEPTED CLIENT DEALS & SLA REMEDIATION</h2>
        <div className="mt-4 space-y-3">
          {(!report.accepted_deals || report.accepted_deals.length === 0) ? (
            <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-4 text-xs text-neutral-500">
              No commercial client contracts were executed during this tenure.
            </div>
          ) : (
            report.accepted_deals.map((deal, idx) => (
              <div
                key={idx}
                className="flex flex-col justify-between gap-3 rounded border border-neutral-800 bg-neutral-950/80 p-4 md:flex-row md:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300">
                      Q{deal.quarter} OFFER
                    </span>
                    <span className="font-bold text-white">{deal.client_name}</span>
                    <span className="text-xs text-neutral-400">({deal.client_type})</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-400">
                    Contract Value: <span className="font-semibold text-emerald-400">${deal.value.toLocaleString()}</span> | Relationship:{" "}
                    <span className="text-neutral-300">{deal.relationship_score.toFixed(0)}/100</span>
                  </div>
                </div>
                <div className="rounded border border-neutral-700 bg-neutral-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-300">
                  STATUS: {deal.status}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Press Headlines & Media Coverage */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">PRESS HEADLINES & CORPORATE REPUTATION</h2>
        <div className="mt-4 space-y-3">
          {(!report.press_summaries || report.press_summaries.length === 0) ? (
            <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-4 text-xs text-neutral-500">
              No press archives recorded for this tenure.
            </div>
          ) : (
            report.press_summaries.map((p, idx) => (
              <div key={idx} className="rounded border border-neutral-800 bg-neutral-950/80 p-4">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Q{p.quarter} PRESS COVERAGE</span>
                  <span className="text-neutral-400">{p.reputation_impact || "Neutral coverage"}</span>
                </div>
                <div className="mt-1 font-bold text-neutral-200">{p.headline}</div>
                {p.details && <div className="mt-1 text-xs text-neutral-400">{p.details}</div>}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quarter by Quarter Decisions Log */}
      <div className="rounded-lg border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-xs uppercase tracking-wider text-neutral-400">EXECUTIVE DECISION LOG (Q1 - Q4)</h2>
        <div className="mt-4 space-y-3">
          {(!report.decisions || report.decisions.length === 0) ? (
            <div className="rounded border border-neutral-800/80 bg-neutral-950/60 p-4 text-xs text-neutral-500">
              No formal decision logs recorded.
            </div>
          ) : (
            report.decisions.map((d, idx) => (
              <div key={idx} className="rounded border border-neutral-800/80 bg-neutral-950/60 p-3 text-xs">
                <div className="flex items-center justify-between text-neutral-500">
                  <span className="font-semibold text-emerald-400 uppercase">
                    Q{d.quarter} // {d.decision_type}
                  </span>
                  {d.stat_deltas && Object.keys(d.stat_deltas).length > 0 && (
                    <span className="text-neutral-400">
                      Deltas: {JSON.stringify(d.stat_deltas)}
                    </span>
                  )}
                </div>
                <div className="mt-1 text-neutral-300 font-sans">{d.summary}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center justify-between gap-4 border-t border-neutral-800 pt-6 sm:flex-row">
        <Link
          href="/hq/leaderboard"
          className="w-full sm:w-auto rounded border border-emerald-500/50 bg-emerald-950/30 px-6 py-3 text-center text-xs uppercase tracking-wider font-bold text-emerald-400 hover:bg-emerald-900/50 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.2)]"
        >
          VIEW GLOBAL LEADERBOARD →
        </Link>
        <Link
          href="/hq"
          className="w-full sm:w-auto rounded border border-neutral-700 bg-neutral-900 px-6 py-3 text-center text-xs uppercase tracking-wider text-neutral-300 hover:bg-neutral-800 transition-colors"
        >
          RETURN TO HEADQUARTERS
        </Link>
      </div>
    </div>
  );
}