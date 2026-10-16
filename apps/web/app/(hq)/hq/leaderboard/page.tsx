"use client";

import { useState } from "react";
import { useSession } from "@/lib/hooks/use-session";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { Trophy, Medal, ArrowLeft, RefreshCw, ShieldCheck, User, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [batchTab, setBatchTab] = useState<"overall" | "day1" | "day2">("overall");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: rows, isLoading, isError, refetch, isFetching } = useLeaderboard(statusFilter, batchTab);

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 p-4 sm:p-8 font-sans selection:bg-amber-500 selection:text-black">
      {/* Background Cyber Grid */}
      <div className="fixed inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative max-w-4xl mx-auto space-y-6">
        
        {/* Top Navigation & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-amber-500/20 pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/hq")}
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-amber-400 font-mono text-xs tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>RETURN TO HQ</span>
            </button>
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>AUTHORITATIVE RESULTS</span>
            </div>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 font-mono text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            <span>SYNC DATA</span>
          </button>
        </div>

        {/* Title Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs tracking-widest uppercase">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>CORPORATE APOCALYPSE 2400 // GLOBAL STANDINGS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono">
            EXECUTIVE LEADERBOARD
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {batchTab === "overall"
              ? "OVERALL STANDINGS // ADJUSTED SCORES DISPLAYED PROMINENTLY WITH HISTORICAL RAW SCORES."
              : batchTab === "day1"
              ? "DAY 01 STANDINGS // RAW PERFORMANCE SCORES FOR BATCH 1 PARTICIPANTS."
              : "DAY 02 STANDINGS // RAW PERFORMANCE SCORES FOR BATCH 2 PARTICIPANTS."}
          </p>
        </div>

        {/* Batch Selection Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          {[
            { id: "overall", label: "OVERALL STANDINGS" },
            { id: "day1", label: "DAY 1 BATCH" },
            { id: "day2", label: "DAY 2 BATCH" },
          ].map((tab) => {
            const isActive = batchTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setBatchTab(tab.id as "overall" | "day1" | "day2")}
                className={`px-4 py-2 text-xs font-mono font-bold tracking-wider rounded border transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                    : "bg-slate-900/90 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Secondary Status Filter Pills */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          {[
            { id: "all", label: "ALL OUTCOMES" },
            { id: "survived", label: "SURVIVED (Q4)" },
            { id: "bankrupt", label: "BANKRUPT" },
            { id: "fired", label: "FIRED BY BOARD" },
          ].map((tab) => {
            const isActive = statusFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-mono font-semibold tracking-wider rounded border transition-all cursor-pointer ${
                  isActive
                    ? "bg-slate-800 text-amber-400 border-amber-500/60 shadow-sm"
                    : "bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Loading / Error States */}
        {isLoading && (
          <div className="flex items-center justify-center p-12 text-amber-400 font-mono text-sm tracking-wider">
            <RefreshCw className="w-5 h-5 animate-spin mr-3" />
            COMPUTING AUTHORITATIVE STANDINGS...
          </div>
        )}

        {isError && (
          <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 font-mono text-xs">
            Failed to load global standings. Please check network connectivity and refresh.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && rows && rows.length === 0 && (
          <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-slate-400 font-mono text-xs space-y-2">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
            <p>NO COMPLETED SESSIONS RECORDED FOR THIS SELECTION</p>
            <p className="text-[11px] text-slate-500">
              Final executive scores are tabulated upon surviving all 4 quarters or concluding insolvency.
            </p>
          </div>
        )}

        {/* Leaderboard Table / Cards */}
        {!isLoading && rows && rows.length > 0 && (
          <div className="space-y-2.5">
            {rows.map((row) => {
              const isYou = session?.company?.name === row.company_name;
              const isFirst = row.rank === 1;
              const isSecond = row.rank === 2;
              const isThird = row.rank === 3;

              let rankBadgeStyle = "bg-slate-800 text-slate-400 border-slate-700";
              let cardBorder = "border-slate-800/80 bg-[#0b0f19]/90 hover:border-slate-700";

              if (isFirst) {
                rankBadgeStyle = "bg-amber-500 text-black border-amber-300 font-black shadow-[0_0_15px_rgba(251,191,36,0.5)]";
                cardBorder = "border-amber-500/60 bg-gradient-to-r from-amber-950/30 via-[#0e1424] to-[#0a0d16] shadow-[0_0_30px_rgba(251,191,36,0.15)]";
              } else if (isSecond) {
                rankBadgeStyle = "bg-slate-300 text-black border-slate-100 font-bold";
                cardBorder = "border-slate-400/40 bg-gradient-to-r from-slate-900/40 to-[#0a0d16]";
              } else if (isThird) {
                rankBadgeStyle = "bg-amber-700 text-amber-100 border-amber-600 font-bold";
                cardBorder = "border-amber-800/40 bg-gradient-to-r from-amber-950/20 to-[#0a0d16]";
              }

              if (isYou) {
                cardBorder = "border-amber-400 bg-amber-950/20 ring-1 ring-amber-400/50";
              }

              // Terminal outcome badge styles
              const term = row.terminal_status || row.status || "SURVIVED · Q4";
              const isBankrupt = term.includes("BANKRUPT");
              const isFired = term.includes("FIRED");

              const terminalBadgeClass = isBankrupt
                ? "bg-red-950/70 border-red-500/40 text-red-300"
                : isFired
                ? "bg-amber-950/70 border-amber-500/40 text-amber-300"
                : "bg-emerald-950/70 border-emerald-500/40 text-emerald-300";

              return (
                <div
                  key={row.id}
                  className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border transition-all duration-200 gap-3 ${cardBorder}`}
                >
                  {/* Left: Rank & Participant / Company Details */}
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-9 h-9 rounded-md border flex items-center justify-center font-mono text-sm shrink-0 ${rankBadgeStyle}`}
                    >
                      {isFirst ? (
                        <Medal className="w-5 h-5 text-black" />
                      ) : (
                        <span>#{row.rank}</span>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm sm:text-base text-white tracking-wide flex items-center gap-1.5 truncate">
                          <User className="w-3.5 h-3.5 text-amber-400" />
                          <span>{row.participant_name || "Executive CEO"}</span>
                          {isYou && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-amber-500 text-black font-extrabold rounded">
                              YOU
                            </span>
                          )}
                        </span>

                        {row.branch && (
                          <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/30">
                            {row.branch}
                          </span>
                        )}

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          row.day_batch === 1
                            ? "text-purple-300 bg-purple-950/50 border-purple-500/30"
                            : "text-blue-300 bg-blue-950/50 border-blue-500/30"
                        }`}>
                          {row.day_batch === 1 ? "DAY 01" : "DAY 02"}
                        </span>

                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${terminalBadgeClass}`}>
                          {row.terminal_status || row.status || "SURVIVED · Q4"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
                        <span className="text-amber-400/90 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          <span>{row.company_name}</span>
                        </span>
                        <span>•</span>
                        <span>{row.sector}</span>
                        {row.masked_prn && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400">{row.masked_prn}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Score Breakdown (Day 1 / Day 2 show raw score; Overall shows adjusted score prominently and raw score underneath) */}
                  {batchTab === "overall" ? (
                    <div className="flex items-center sm:flex-col items-end gap-0.5 shrink-0 self-end sm:self-center">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold">
                        ADJUSTED SCORE
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-tight">
                        {(row.adjusted_score ?? row.final_score).toFixed(1)}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-medium">
                        RAW: {(row.raw_score ?? row.final_score).toFixed(1)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center sm:flex-col items-end gap-0.5 shrink-0 self-end sm:self-center">
                      <span className="text-[10px] font-mono text-slate-400 tracking-wider font-semibold">
                        RAW SCORE
                      </span>
                      <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-tight">
                        {(row.raw_score ?? row.final_score).toFixed(1)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer Note */}
        <div className="pt-4 border-t border-slate-800 text-[11px] font-mono text-slate-500 flex flex-col sm:flex-row justify-between items-center gap-2">
          <span>TIE-BREAKER PROTOCOL: PERSISTED FINAL SCORE DESCENDING // COMPLETION TIMESTAMP ASCENDING</span>
          <span>SYMBITECH 2026 // AUTHORITATIVE ENGINE</span>
        </div>

      </div>
    </div>
  );
}