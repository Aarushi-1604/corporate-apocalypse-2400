"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, logoutSession } from "@/lib/hooks/use-session";
import { restartSession } from "@/lib/hooks/use-restart";
import { useAnnualReport } from "@/lib/hooks/use-annual-report";
import { useQueryClient } from "@tanstack/react-query";

function cleanPressDetails(details?: string | null): string {
  if (!details) return "Press conference evaluated by municipal press corps.";
  if (details.includes("{") && details.includes("}")) {
    const verdictMatch = details.match(/['"]media_verdict['"]\s*:\s*['"]([^'"]+)['"]/);
    if (verdictMatch && verdictMatch[1]) {
      return `Verdict: ${verdictMatch[1]}`;
    }
    const toneMatch = details.match(/['"]tone['"]\s*:\s*['"]([^'"]+)['"]/);
    if (toneMatch && toneMatch[1]) {
      return `Tone: ${toneMatch[1]}`;
    }
    const articleMatch = details.match(/['"]article_body['"]\s*:\s*['"]([^'"]+)['"]/);
    if (articleMatch && articleMatch[1]) {
      const cleanArticle = articleMatch[1].replace(/\\n/g, " ");
      return cleanArticle.length > 240 ? `${cleanArticle.slice(0, 240)}...` : cleanArticle;
    }
    return "Official statement on the record with municipal press corps.";
  }
  return details;
}

function cleanStatDeltas(deltas?: Record<string, any> | null): Array<{ label: string; isPositive: boolean; isNegative: boolean }> {
  if (!deltas || typeof deltas !== "object") return [];
  const entries: Array<{ label: string; isPositive: boolean; isNegative: boolean }> = [];
  const ignoredKeys = new Set([
    "insolvent",
    "required_amount",
    "available_cash",
    "headline",
    "questions",
    "statements",
    "commitments",
    "article_body",
    "media_verdict",
    "tone",
    "score",
  ]);

  for (const [k, v] of Object.entries(deltas)) {
    if (ignoredKeys.has(k)) continue;
    const num = Number(v);
    if (isNaN(num)) continue;
    if (Math.abs(num) < 0.08 && k !== "cash") continue;

    if (k === "cash") {
      entries.push({
        label: `${num > 0 ? "+" : "-"}₹${Math.abs(Math.round(num)).toLocaleString()} CASH`,
        isPositive: num > 0,
        isNegative: num < 0,
      });
    } else {
      const rounded = num.toFixed(1);
      const sign = num > 0 ? "+" : "";
      entries.push({
        label: `${sign}${rounded} ${k.toUpperCase()}`,
        isPositive: num > 0,
        isNegative: num < 0,
      });
    }
  }
  return entries;
}

export default function AnnualReportPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const { data: report, isLoading, isError } = useAnnualReport(session?.company_id);
  const [isResetting, setIsResetting] = useState(false);

  const handleRestart = async () => {
    setIsResetting(true);
    try {
      await restartSession();
      queryClient.clear();
      router.push("/assignment");
    } catch {
      await logoutSession();
      queryClient.clear();
      router.push("/login");
    } finally {
      setIsResetting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030206] text-white flex flex-col items-center justify-center p-6 font-mono">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        <p className="mt-4 text-xs font-bold tracking-[0.25em] text-emerald-400 uppercase">
          DECRYPTING AUTHORITATIVE ANNUAL AUDIT ARCHIVE...
        </p>
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="min-h-screen bg-[#030206] text-white flex flex-col items-center justify-center p-6 font-mono">
        <div className="max-w-md w-full rounded-lg border border-red-500/40 bg-neutral-950/90 p-8 text-center shadow-2xl">
          <span className="text-xs font-bold tracking-widest text-red-400 uppercase">
            ARCHIVE RESTRICTED // AUDIT PENDING
          </span>
          <h2 className="mt-2 text-xl font-black text-white uppercase font-sans">
            ANNUAL REPORT NOT YET AVAILABLE
          </h2>
          <p className="mt-3 text-xs leading-relaxed text-slate-400 font-sans">
            The Authoritative Annual Executive Audit is compiled only upon conclusion of Quarter 4, company insolvency default, or formal board dismissal.
          </p>
          <button
            onClick={() => router.push("/hq")}
            className="mt-6 w-full py-3 bg-neutral-900 border border-neutral-700 hover:border-emerald-500 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            ← RETURN TO HQ OPERATIONS
          </button>
        </div>
      </div>
    );
  }

  const isSurvived = report.outcome === "SURVIVED";
  const isBankrupt = report.outcome === "BANKRUPT";
  const isFired = report.outcome === "FIRED";

  // Dynamic Theme Palette matching Bankruptcy / Fired screens
  const theme = isBankrupt
    ? {
        accent: "red",
        border: "border-red-600/80",
        borderSubtle: "border-red-900/60",
        bgBadge: "bg-red-950/80 text-red-300 border-red-500/60",
        shadow: "shadow-[0_0_25px_rgba(239,68,68,0.25)]",
        titleColor: "text-red-500",
        glow: "drop-shadow-[0_0_25px_rgba(239,68,68,0.45)]",
        directive: "GOVERNANCE DIRECTIVE // EMERGENCY RESOLUTION 2400-B",
        heroTitle: "CORPORATE COLLAPSE",
        statusSubtitle: "BANKRUPTCY DECLARED",
        prose:
          "Your company could not meet its mandatory financial obligations. Operations, market activities, and strategic negotiations have ceased under emergency statutory liquidation.",
      }
    : isFired
    ? {
        accent: "amber",
        border: "border-amber-500/80",
        borderSubtle: "border-amber-900/60",
        bgBadge: "bg-amber-950/80 text-amber-300 border-amber-500/60",
        shadow: "shadow-[0_0_25px_rgba(245,158,11,0.25)]",
        titleColor: "text-amber-500",
        glow: "drop-shadow-[0_0_25px_rgba(245,158,11,0.45)]",
        directive: "DIRECTORATE REMOVAL // STATUTORY DISMISSAL 2400-C",
        heroTitle: "EXECUTIVE DISMISSAL",
        statusSubtitle: "FIRED BY BOARD",
        prose:
          "The Board of Directors has voted to terminate your executive tenure following collapse of board confidence below the statutory 30% quorum threshold.",
      }
    : {
        accent: "emerald",
        border: "border-emerald-500/80",
        borderSubtle: "border-emerald-900/60",
        bgBadge: "bg-emerald-950/80 text-emerald-300 border-emerald-500/60",
        shadow: "shadow-[0_0_25px_rgba(16,185,129,0.25)]",
        titleColor: "text-emerald-400",
        glow: "drop-shadow-[0_0_25px_rgba(16,185,129,0.45)]",
        directive: "GOVERNANCE RATIFICATION // ANNUAL RESOLUTION 2400-A",
        heroTitle: "MANDATE RATIFIED",
        statusSubtitle: "SURVIVED · QUARTER 04",
        prose:
          "Executive mandate validated across all four operational quarters. The Board of Directors and corporate stakeholders have approved final fiscal and operational performance.",
      };

  const quarterNumber = report.ending_quarter ?? (report.history?.length || 4);

  return (
    <div className="min-h-screen bg-[#030206] text-white flex flex-col items-center p-4 sm:p-6 md:p-12 relative overflow-hidden font-mono selection:bg-amber-500 selection:text-black">
      {/* Background Cyber Scanlines & Ambient Outcome Glow */}
      <div
        className={`absolute inset-0 pointer-events-none opacity-20 ${
          isBankrupt
            ? "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.25),rgba(0,0,0,0))]"
            : isFired
            ? "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(245,158,11,0.25),rgba(0,0,0,0))]"
            : "bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.25),rgba(0,0,0,0))]"
        }`}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0a0d_1px,transparent_1px),linear-gradient(to_bottom,#1f0a0d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-35 pointer-events-none" />

      {/* Main Terminal Dossier */}
      <div className="relative w-full max-w-4xl z-10 flex flex-col gap-6 animate-in fade-in duration-500">
        
        {/* Terminal Header Bar */}
        <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 ${theme.border} pb-4`}>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isBankrupt ? "bg-red-400" : isFired ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isBankrupt ? "bg-red-600" : isFired ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <span
              className={`text-xs md:text-sm font-bold tracking-[0.25em] uppercase ${
                isBankrupt ? "text-red-400" : isFired ? "text-amber-400" : "text-emerald-400"
              }`}
            >
              {theme.directive}
            </span>
          </div>
          <span className={`text-[11px] font-bold tracking-widest px-3 py-1 uppercase border ${theme.bgBadge} ${theme.shadow}`}>
            {isBankrupt ? "TERMINAL STATUS // INSOLVENT" : isFired ? "TERMINAL STATUS // DISMISSED" : "MANDATE // RATIFIED · Q4"}
          </span>
        </div>

        {/* Hero Title Announcement */}
        <div className="flex flex-col gap-2 pt-1">
          <h1 className={`text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight m-0 uppercase font-sans ${theme.titleColor} ${theme.glow}`}>
            {theme.heroTitle}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xl sm:text-2xl font-bold tracking-widest text-white uppercase">
              {theme.statusSubtitle}
            </span>
            <span
              className={`text-xs px-2.5 py-0.5 font-bold uppercase border ${
                isBankrupt
                  ? "bg-red-900/60 text-red-200 border-red-600/60"
                  : isFired
                  ? "bg-amber-900/60 text-amber-200 border-amber-600/60"
                  : "bg-emerald-900/60 text-emerald-200 border-emerald-600/60"
              }`}
            >
              {isBankrupt || isFired ? "SESSION TERMINATED" : "MANDATE COMPLETE"}
            </span>
          </div>
          <p className="text-slate-300 text-sm sm:text-base font-sans leading-relaxed max-w-3xl mt-1">
            {theme.prose}
          </p>
        </div>

        {/* Authoritative Audit Data Cluster (2-Column Dossier Card) */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 bg-neutral-950/90 border ${theme.borderSubtle} p-5 sm:p-6 shadow-2xl`}>
          {/* Left Column: Corporate Identity & Legal Status */}
          <div className="flex flex-col gap-4 border-b md:border-b-0 md:border-r border-neutral-900 pb-4 md:pb-0 md:pr-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">ENTERPRISE IDENTIFIER</span>
              <span className="text-lg sm:text-xl font-bold text-white uppercase">{report.company_name || "CORPORATION"}</span>
              <span className="text-xs text-amber-400 font-bold uppercase">{report.sector || "General Industry"}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">CHIEF EXECUTIVE OFFICER</span>
              <span className="text-sm sm:text-base font-bold text-slate-200 uppercase">{report.ceo_name || "Executive Appointee"}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">MANDATE STATUS &amp; OUTCOME</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded border inline-block w-fit uppercase ${theme.bgBadge}`}>
                {report.outcome} · QUARTER 0{quarterNumber}
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">AUDIT RATIONALE</span>
              <p className="text-xs text-slate-300 font-sans leading-snug m-0">
                {report.terminal_reason || "Mandate finalized under authoritative corporate governance protocols."}
              </p>
            </div>
          </div>

          {/* Right Column: Capital Solvency Breakdown & Authoritative Score */}
          <div className="flex flex-col justify-between gap-4 md:pl-4">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">
                CAPITAL SOLVENCY &amp; GOVERNANCE MATRIX
              </span>

              <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-xs sm:text-sm">
                <span className="text-slate-400">FINAL LIQUID CASH RESERVES:</span>
                <span className={`font-bold font-mono text-base ${isBankrupt ? "text-red-400" : "text-emerald-400"}`}>
                  ₹{report.final_cash.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-xs sm:text-sm">
                <span className="text-slate-400">CLOSING BOARD CONFIDENCE:</span>
                <span className={`font-bold font-mono text-base ${(report.final_kpis?.board_confidence ?? 50) < 30 ? "text-red-400" : "text-cyan-400"}`}>
                  {(report.final_kpis?.board_confidence ?? 50).toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-900 pb-2 text-xs sm:text-sm">
                <span className="text-slate-400">LEGAL &amp; SOLVENCY STANDING:</span>
                <span className={`font-bold text-xs uppercase ${isBankrupt ? "text-red-400" : isFired ? "text-amber-400" : "text-emerald-400"}`}>
                  {isBankrupt
                    ? "INSOLVENT // IRREVERSIBLE TERMINAL STATE"
                    : isFired
                    ? "GOVERNANCE DISMISSAL // BELOW QUORUM"
                    : "SOLVENT WORKING CAPITAL // RATIFIED"}
                </span>
              </div>
            </div>

            {/* CEO Final Score Badge */}
            <div className="p-4 bg-gradient-to-r from-neutral-900/90 to-neutral-950 border border-slate-700/80 flex items-center justify-between rounded shadow-inner">
              <div className="flex flex-col">
                <span className="text-[10px] tracking-widest text-slate-400 uppercase font-bold">
                  FINAL AUTHORITATIVE CEO SCORE
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  NORMALIZED 100.0 EXECUTIVE INDEX
                </span>
              </div>
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 tracking-tight font-mono">
                {(report.final_score ?? 0).toFixed(1)} PTS
              </span>
            </div>
          </div>
        </div>

        {/* Executive Scoring Matrix Breakdown */}
        <div className="border border-slate-800 bg-neutral-950/80 p-5 flex flex-col gap-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            EXECUTIVE SCORING MATRIX BREAKDOWN (7-FACTOR GOVERNANCE)
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center">
            {[
              { label: "REVENUE", val: report.score_breakdown?.revenue_score ?? report.revenue_score, isPenalty: false },
              { label: "PROFIT", val: report.score_breakdown?.profit_score ?? report.profit_score, isPenalty: false },
              { label: "SATISFACTION", val: report.score_breakdown?.satisfaction_score ?? report.satisfaction_score, isPenalty: false },
              { label: "INNOVATION", val: report.score_breakdown?.innovation_score ?? report.innovation_score, isPenalty: false },
              { label: "INVESTOR", val: report.score_breakdown?.investor_score ?? report.investor_score, isPenalty: false },
              { label: "SURVIVAL", val: report.score_breakdown?.survival_score ?? report.survival_score, isPenalty: false },
              { label: "RISK PENALTY", val: report.score_breakdown?.risk_penalty ?? report.risk_penalty, isPenalty: true },
            ].map((metric, i) => (
              <div key={i} className="rounded border border-neutral-900 bg-black/60 p-2.5 flex flex-col">
                <span className="text-[9px] uppercase tracking-wider text-slate-500">{metric.label}</span>
                <span
                  className={`mt-1 text-base font-bold font-mono ${
                    metric.isPenalty ? "text-red-400" : "text-slate-100"
                  }`}
                >
                  {metric.isPenalty ? `-${(metric.val ?? 0).toFixed(0)}` : (metric.val ?? 0).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Board Assessment Dossier */}
        <div className="border border-slate-800 bg-neutral-950/80 p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 border border-cyan-600/40 uppercase">
              BOARD OF DIRECTORS // STATUTORY ASSESSMENT
            </span>
            <span className="text-[11px] text-slate-500 font-mono">GOVERNANCE ARCHIVE</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed m-0 pt-1">
            {report.final_board_assessment || "No formal governance commentary recorded."}
          </p>
        </div>

        {/* Press Coverage & Media Reputation (Defensively Parsed) */}
        <div className="border border-slate-800 bg-neutral-950/80 p-5 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 border border-amber-600/40 uppercase">
              CORPORATE TIMES // REPUTATION DISPATCHES
            </span>
            <span className="text-[11px] text-slate-500 font-mono">PUBLIC ARCHIVE</span>
          </div>

          <div className="space-y-3 pt-1">
            {!report.press_summaries || report.press_summaries.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono m-0">No public media coverage was archived for this tenure.</p>
            ) : (
              report.press_summaries.map((p, idx) => (
                <div key={idx} className="rounded border border-neutral-900 bg-black/60 p-3.5 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="font-bold text-amber-400">QUARTER 0{p.quarter} PRESS COVERAGE</span>
                    <span className="text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                      {p.reputation_impact || "Neutral coverage"}
                    </span>
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-200 tracking-wide m-0">
                    {p.headline}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed m-0">
                    {cleanPressDetails(p.details)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Accepted Client Deals */}
        {report.accepted_deals && report.accepted_deals.length > 0 && (
          <div className="border border-slate-800 bg-neutral-950/80 p-5 flex flex-col gap-3">
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              COMMERCIAL CLIENT CONTRACTS &amp; SLA REMEDIATION
            </span>
            <div className="space-y-2.5">
              {report.accepted_deals.map((deal, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded border border-neutral-900 bg-black/60 p-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 bg-neutral-800 px-1.5 py-0.2 rounded font-bold">
                        Q{deal.quarter} DEAL
                      </span>
                      <span className="font-bold text-white">{deal.client_name}</span>
                      <span className="text-slate-400">({deal.client_type})</span>
                    </div>
                    <div className="mt-1 text-slate-400">
                      Value: <span className="font-bold text-emerald-400">₹{(deal.value ?? 0).toLocaleString()}</span> | Relationship:{" "}
                      <span className="text-slate-200">{(deal.relationship_score ?? 50).toFixed(0)}/100</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-neutral-900 px-2.5 py-1 rounded border border-neutral-800 w-fit">
                    {deal.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Executive Decision Log (Clean, Rounded Deltas without float garbage) */}
        <div className="border border-slate-800 bg-neutral-950/80 p-5 flex flex-col gap-3">
          <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
            AUDITED EXECUTIVE DECISION TIMELINE (Q1 – Q{quarterNumber})
          </span>
          <div className="space-y-2.5 pt-1">
            {!report.decisions || report.decisions.length === 0 ? (
              <p className="text-xs text-slate-500 font-mono m-0">No strategic executive decisions were logged.</p>
            ) : (
              report.decisions.map((d, idx) => {
                const deltas = cleanStatDeltas(d.stat_deltas);
                return (
                  <div key={idx} className="rounded border border-neutral-900 bg-black/60 p-3 text-xs flex flex-col gap-1.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="font-bold text-amber-400 uppercase tracking-wide">
                        QUARTER 0{d.quarter} // {d.decision_type.toUpperCase()}
                      </span>
                      {deltas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {deltas.map((badge, bIdx) => (
                            <span
                              key={bIdx}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                                badge.isPositive
                                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                                  : badge.isNegative
                                  ? "bg-red-950/60 text-red-300 border-red-500/40"
                                  : "bg-neutral-800 text-neutral-300 border-neutral-700"
                              }`}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-slate-300 font-sans leading-relaxed m-0 text-xs">
                      {d.summary}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Primary Action Buttons (matching Bankruptcy page layout) */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <Link
            href="/hq/leaderboard"
            className="w-full sm:w-1/2 p-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/60 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] cursor-pointer active:scale-[0.99]"
          >
            [ VIEW GLOBAL LEADERBOARD ]
          </Link>

          {isSurvived ? (
            <button
              onClick={() => router.push("/hq")}
              type="button"
              className="w-full sm:w-1/2 p-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-neutral-900 hover:bg-neutral-800 text-slate-200 border border-neutral-700 hover:border-slate-500 transition-all cursor-pointer active:scale-[0.99]"
            >
              [ RETURN TO HQ DISTRICT ]
            </button>
          ) : (
            <button
              onClick={handleRestart}
              disabled={isResetting}
              type="button"
              className="w-full sm:w-1/2 p-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/60 transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_30px_rgba(239,68,68,0.45)] cursor-pointer active:scale-[0.99] disabled:opacity-50"
            >
              {isResetting ? "[ RESETTING SESSION... ]" : "[ ACCEPT A NEW APPOINTMENT ]"}
            </button>
          )}
        </div>

        {/* Statutory Subtext */}
        <p className="text-[10px] text-slate-600 text-center tracking-widest uppercase m-0 pb-4">
          CORPORATE APOCALYPSE 2400 // SYMBITECH 2026 // ANNUAL EXECUTIVE AUDIT DOSSIER
        </p>

      </div>
    </div>
  );
}