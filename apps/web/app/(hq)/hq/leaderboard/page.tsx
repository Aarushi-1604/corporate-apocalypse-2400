"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";
import { Trophy, Medal, ArrowLeft, RefreshCw, ShieldCheck, User, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function LeaderboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: rows, isLoading, isError, refetch, isFetching } = useLeaderboard();

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
              className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-amber-500 text-slate-300 hover:text-amber-400 font-mono text-xs tracking-wider flex items-center gap-1.5 transition-colors"
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
            className="px-3 py-1.5 rounded bg-amber-500/10 border border-amber-500/40 hover:bg-amber-500/20 text-amber-300 font-mono text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
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
            TOP 10 EXECUTIVE LEADERBOARD
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            OFFICIAL SCORING ENGINE // RANKS AUTHORITATIVELY PERSISTED FINAL SCORES ACROSS COMPLETED SESSIONS.
          </p>
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
            <p>NO COMPLETED SESSIONS RECORDED YET</p>
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
                    <div className="min-w-0 flex-1 space-y-0.5">
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

                        {row.masked_prn && (
                          <span className="text-[11px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {row.masked_prn}
                          </span>
                        )}

                        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-500/20">
                          {row.status || "Completed Run"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
                        <span className="text-amber-400/90 flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-amber-400" />
                          <span>{row.company_name}</span>
                        </span>
                        <span>•</span>
                        <span>{row.sector}</span>
                        {row.branch && (
                          <>
                            <span>•</span>
                            <span className="text-slate-300 truncate max-w-[200px]" title={row.branch}>
                              {row.branch}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Score */}
                  <div className="flex items-center sm:flex-col items-end gap-1 shrink-0 self-end sm:self-center">
                    <span className="text-[10px] font-mono text-slate-500 tracking-wider">
                      FINAL SCORE
                    </span>
                    <span className="text-xl sm:text-2xl font-black font-mono text-amber-400 tracking-tight">
                      {row.final_score.toFixed(1)}
                    </span>
                  </div>
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