"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import {
  useMarket,
  useMarketCascadeScenarios,
  useStrategicDilemmas,
  CascadeEvaluationResult,
} from "@/lib/hooks/use-market";
import { useDepartmentLocks } from "@/lib/hooks/use-company-state";
import { useQueryClient } from "@tanstack/react-query";
import { SystemBar } from "@/components/domain/FigmaCityMap";
import { MarketCascadeGame } from "@/components/domain/MarketCascadeGame";
import { LiveMarketIntelligence } from "@/components/domain/LiveMarketIntelligence";
import { StrategicDecisionStage } from "@/components/domain/StrategicDecisionStage";
import { soundManager } from "@/lib/audio";

type MarketStage =
  | "cmo_briefing"
  | "cascade_training"
  | "cascade_verdict"
  | "live_intelligence"
  | "strategic_decision"
  | "corporate_times_locked";

export default function MarketDepartmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading: isSessionLoading } = useSession();
  const companyId = session?.company_id;
  const quarter = session?.current_quarter ?? 1;

  // Department lock status from persisted DB records
  const { data: deptLocks } = useDepartmentLocks(companyId);
  const isMarketLocked = Boolean(deptLocks?.market?.locked);

  // Active Stage State: starts at CMO briefing unless already completed
  const [stage, setStage] = useState<MarketStage>("cmo_briefing");
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);

  // Track scores for all 5 cascade scenarios to compute average >= 75%
  const [scenarioScores, setScenarioScores] = useState<number[]>([]);

  // Queries
  const { data: scenarios, isLoading: isScenariosLoading } = useMarketCascadeScenarios();
  const { data: marketData, isLoading: isMarketLoading } = useMarket(companyId);
  const { data: dilemmas, isLoading: isDilemmasLoading } = useStrategicDilemmas(companyId);

  // Check if player already completed cascade training this quarter or locked
  useEffect(() => {
    if (!companyId) return;
    if (isMarketLocked) {
      setStage("corporate_times_locked");
      return;
    }
    const key = `market_cascade_completed_${companyId}_q${quarter}`;
    const alreadyDone = typeof window !== "undefined" && localStorage.getItem(key) === "true";
    if (alreadyDone) {
      setStage("live_intelligence");
    }
  }, [companyId, quarter, isMarketLocked]);

  if (isSessionLoading || !session) {
    return (
      <main className="market-screen-container">
        <header className="system-bar">
          <div className="system-brand">
            <div className="brand-mark">
              <i /><i /><i />
            </div>
            <span>APEX DYNAMICS</span>
          </div>
          <div className="location-readout">
            <i />
            <span>MARKET RECONNAISSANCE // CONNECTING</span>
          </div>
        </header>
        <div style={{ display: "grid", placeItems: "center", minHeight: "80vh", color: "var(--red-bright)" }}>
          <p style={{ letterSpacing: "0.2em", fontFamily: "Syncopate, sans-serif" }}>
            ESTABLISHING SECURE PROTOCOL // MARKETING &amp; INTELLIGENCE...
          </p>
        </div>
      </main>
    );
  }

  const handleBackToHQ = () => {
    router.push("/hq");
  };

  const currentScenario = scenarios?.[activeScenarioIdx];
  const activeDilemma = dilemmas?.[0];
  const totalScenarios = scenarios?.length ?? 5;

  // Average score calculation
  const totalScoreSum = scenarioScores.reduce((acc, curr) => acc + curr, 0);
  const averageCascadeScore =
    scenarioScores.length > 0
      ? Math.round(totalScoreSum / scenarioScores.length)
      : 0;
  const isCascadePassed = averageCascadeScore >= 75;

  const handleScenarioEvaluation = (result: CascadeEvaluationResult) => {
    setScenarioScores((prev) => {
      const next = [...prev];
      next[activeScenarioIdx] = result.score;
      return next;
    });
  };

  const handleAdvanceScenario = () => {
    if (activeScenarioIdx < totalScenarios - 1) {
      setActiveScenarioIdx((prev) => prev + 1);
    } else {
      // Reached end of all scenarios: show verdict screen
      setStage("cascade_verdict");
    }
  };

  const handleRedoCascades = () => {
    soundManager.playAlert();
    setActiveScenarioIdx(0);
    setScenarioScores([]);
    setStage("cascade_training");
  };

  const handleProceedToDirectives = () => {
    if (companyId) {
      const key = `market_cascade_completed_${companyId}_q${quarter}`;
      try {
        localStorage.setItem(key, "true");
      } catch {}
    }
    soundManager.playSuccess();
    setStage("live_intelligence");
  };

  return (
    <main className="market-screen-container">
      {/* 2400 Unified System Bar */}
      <SystemBar
        section={`MARKETING & ACQUISITIONS // Q0${quarter} STRATEGIC RADAR`}
        companyName={session.company?.name}
        capital={marketData?.company_cash ?? session.company?.cash}
        onBack={handleBackToHQ}
      />

      {/* Futuristic Command Banner */}
      <section className="market-command-banner">
        <div className="market-hud-left">
          <div className="market-label-group">
            <span>DIVISION COMMAND &amp; SURVEILLANCE</span>
            <strong>MARKETING &amp; RECON</strong>
          </div>

          <div className="market-split-stats">
            <div>
              <small>ACTIVE QUARTER</small>
              <b>Q0{quarter}</b>
            </div>
            <div>
              <small>MARKET SHARE</small>
              <b>{marketData ? `${marketData.player_market_share.toFixed(1)}%` : "—"}</b>
            </div>
            <div>
              <small>CASCADE STATUS</small>
              <b style={{ color: isMarketLocked ? "#34d399" : stage === "live_intelligence" || stage === "strategic_decision" ? "var(--gold)" : "#f87171" }}>
                {isMarketLocked ? "LOCKED & RATIFIED" : stage === "cascade_training" ? `MODULE 0${activeScenarioIdx + 1} / 05` : "SURVEILLANCE ACTIVE"}
              </b>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="market-gauge-box">
          <div className="market-gauge-track">
            <div
              className="market-gauge-fill"
              style={{
                width: isMarketLocked
                  ? "100%"
                  : stage === "cmo_briefing"
                  ? "15%"
                  : stage === "cascade_training"
                  ? `${20 + (activeScenarioIdx / totalScenarios) * 40}%`
                  : stage === "cascade_verdict"
                  ? "60%"
                  : stage === "live_intelligence"
                  ? "80%"
                  : "100%",
              }}
            />
          </div>
          <div className="market-gauge-footer">
            <span>CMO BRIEF</span>
            <span>CASCADE PROTOCOLS (75%+ PASS)</span>
            <span>RADAR INTEL</span>
            <span>RATIFIED</span>
          </div>
        </div>

        {/* Global Action / Exit */}
        <div className="capital-hud-actions">
          <button className="reset-alloc-btn" onClick={handleBackToHQ} type="button">
            BACK TO HQ
          </button>
        </div>
      </section>

      <div className="flex-1 overflow-y-auto px-6 pb-12 pt-4">
        {/* Stage 0: CMO Executive Briefing Modal (Centered exactly like COO Briefing) */}
        {stage === "cmo_briefing" && (
          <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
            <section className="briefing-modal market relative">
              <div className="briefing-speaker">
                <div className="briefing-avatar">CMO</div>
                <div>
                  <strong>SARAH CHEN</strong>
                  <span>CHIEF MARKETING OFFICER // CORPORATE RECONNAISSANCE</span>
                </div>
              </div>

              <p className="briefing-text">
                “Welcome to Corporate Reconnaissance, CEO. Before you deploy millions into brand
                expansion or engage in price wars with rival conglomerates, you must master the
                anatomy of a <strong>Market Cascade</strong>. Macroeconomic shocks don&apos;t happen in isolation—a
                single shift in interest rates or crude oil triggers an immediate chain reaction through debt,
                procurement, margins, and consumer demand. Trace the causality correctly, and you will outmaneuver
                every competitor in New Kalki City.”
              </p>

              <div className="briefing-card-grid">
                <div className="briefing-card">
                  <strong>01. TRACE THE SHOCK</strong>
                  <p>
                    Drag statements from origin shock [1] to downstream market consequence [5].
                  </p>
                </div>
                <div className="briefing-card">
                  <strong>02. 75%+ ACCURACY GATE</strong>
                  <p>
                    Maintain at least 75% average transmission accuracy across all 5 modules.
                  </p>
                </div>
                <div className="briefing-card">
                  <strong>03. STRATEGIC CALL</strong>
                  <p>
                    Ratify binding corporate directives on live intelligence wire.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSuccess();
                    setStage("cascade_training");
                  }}
                  className="game-button gold px-10 py-3.5 text-sm font-mono font-bold tracking-widest cursor-pointer"
                >
                  <span>INITIALIZE CASCADE PROTOCOLS →</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Stage 1: Market Cascade Training */}
        {stage === "cascade_training" && (
          <div className="w-full flex items-center justify-center py-2">
            {isScenariosLoading || !currentScenario ? (
              <div className="flex h-96 items-center justify-center font-mono text-slate-400">
                LOADING MARKET CASCADE PROTOCOLS...
              </div>
            ) : (
              <MarketCascadeGame
                scenario={currentScenario}
                scenarioIndex={activeScenarioIdx}
                totalScenarios={totalScenarios}
                onEvaluationComplete={handleScenarioEvaluation}
                onContinue={handleAdvanceScenario}
              />
            )}
          </div>
        )}

        {/* Stage 1.5: Cascade Verdict Screen (75%+ Gate) */}
        {stage === "cascade_verdict" && (
          <div className="market-content-cluster max-w-4xl mx-auto my-8 shadow-2xl animate-in fade-in duration-200">
            <div className="market-cluster-header">
              <div className="market-cluster-header-left">
                <div
                  className="market-cluster-accent-bar"
                  style={{
                    background: isCascadePassed ? "#10b981" : "#ef4444",
                    boxShadow: isCascadePassed
                      ? "0 0 12px rgba(16,185,129,0.8)"
                      : "0 0 12px rgba(239,68,68,0.8)",
                  }}
                />
                <div>
                  <h2 className="market-cluster-title">
                    CASCADE TRAINING EVALUATION
                  </h2>
                  <span className="market-cluster-subline">
                    5-SCENARIO TRANSMISSION ACCURACY VERDICT
                  </span>
                </div>
              </div>
              <span
                className={`font-mono text-xs px-3.5 py-1.5 font-bold border ${
                  isCascadePassed
                    ? "bg-emerald-950/60 border-emerald-500 text-emerald-400"
                    : "bg-red-950/60 border-red-500 text-red-400"
                }`}
              >
                {isCascadePassed ? "PASSED (>= 75%)" : "FAILED (< 75%)"}
              </span>
            </div>

            <div className="market-cluster-body">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 bg-black/80 border border-slate-800 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    CUMULATIVE AVERAGE ACCURACY
                  </span>
                  <span
                    className={`text-4xl font-black font-mono ${
                      isCascadePassed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {averageCascadeScore}%
                    <span className="text-sm text-slate-400 font-normal"> / 75% MINIMUM REQUIRED</span>
                  </span>
                </div>

                <div className="flex gap-2.5">
                  {scenarioScores.map((sc, i) => (
                    <div
                      key={i}
                      className="flex flex-col items-center p-2.5 bg-neutral-900 border border-slate-800 font-mono text-xs min-w-[52px]"
                    >
                      <span className="text-slate-400 text-[11px]">S0{i + 1}</span>
                      <strong className={`text-sm ${sc >= 75 ? "text-emerald-400" : "text-amber-400"}`}>
                        {sc}%
                      </strong>
                    </div>
                  ))}
                </div>
              </div>

              {isCascadePassed ? (
                <div className="p-5 bg-emerald-950/20 border border-emerald-500/40 text-sm font-mono text-slate-200 leading-relaxed">
                  <p className="m-0 text-emerald-300 font-bold mb-1 text-base">
                    ✓ CASCADE TRANSMISSION BENCHMARK CLEARED.
                  </p>
                  You have successfully demonstrated causal mastery over macro market transmission graphs.
                  Reconnaissance clearance granted to analyze live market radar intelligence and execute strategic directives.
                </div>
              ) : (
                <div className="p-5 bg-red-950/30 border border-red-500/50 text-sm font-mono text-slate-200 leading-relaxed">
                  <p className="m-0 text-red-400 font-bold mb-1 text-base">
                    ⚠ CASCADE ACCURACY BELOW REQUIRED THRESHOLD ({averageCascadeScore}% / 75%).
                  </p>
                  Chief Marketing Officer Sarah Chen requires all executives to maintain at least 75% average accuracy across market cascades before risking capital on strategic directives. Protocol reset required.
                </div>
              )}

              <div className="flex justify-end pt-3">
                {isCascadePassed ? (
                  <button
                    type="button"
                    onClick={handleProceedToDirectives}
                    className="game-button gold px-10 py-3.5 text-sm font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>PROCEED TO LIVE MARKET INTELLIGENCE →</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRedoCascades}
                    className="game-button red px-10 py-3.5 text-sm font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>REDO CASCADE PROTOCOLS ↺</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stage 2: Live Corporate Intelligence */}
        {stage === "live_intelligence" && (
          <div className="w-full py-2">
            {isMarketLoading || !marketData ? (
              <div className="flex h-96 items-center justify-center font-mono text-slate-400">
                SYNCHRONIZING CENTRAL RADAR TELEMETRY...
              </div>
            ) : (
              <LiveMarketIntelligence
                marketData={marketData}
                onProceedToDecision={() => setStage("strategic_decision")}
              />
            )}
          </div>
        )}

        {/* Stage 3: Strategic Decision / What Would You Do? */}
        {stage === "strategic_decision" && (
          <div className="w-full py-2">
            {isDilemmasLoading || !activeDilemma || !companyId ? (
              <div className="flex h-96 items-center justify-center font-mono text-slate-400">
                LOADING STRATEGIC BRIEF...
              </div>
            ) : (
              <StrategicDecisionStage
                dilemma={activeDilemma}
                quarter={quarter}
                companyId={companyId}
                isAlreadyCommitted={isMarketLocked}
                onDecisionExecuted={async () => {
                  await queryClient.invalidateQueries({ queryKey: ["department-locks", companyId] });
                  await queryClient.invalidateQueries({ queryKey: ["corporate-times", quarter] });
                  await queryClient.invalidateQueries({ queryKey: ["market", companyId] });
                }}
                onReturnToHQ={() => {
                  router.push("/hq");
                }}
              />
            )}
          </div>
        )}

        {/* Locked Read-Only State: Corporate Times Dispatch Wire Only (Centered with large fonts) */}
        {stage === "corporate_times_locked" && (
          <div className="w-full flex items-center justify-center py-8">
            <div className="market-content-cluster w-full max-w-4xl mx-auto shadow-2xl animate-in fade-in duration-200">
              <div className="market-cluster-header">
                <div className="market-cluster-header-left">
                  <div
                    className="market-cluster-accent-bar"
                    style={{
                      background: "#10b981",
                      boxShadow: "0 0 12px rgba(16,185,129,0.8)",
                    }}
                  />
                  <div>
                    <h2 className="market-cluster-title">
                      THE CORPORATE TIMES // WIRE ARCHIVE
                    </h2>
                    <span className="market-cluster-subline">
                      CONFIRMED RECONNAISSANCE DISPATCH • QUARTER 0{quarter}
                    </span>
                  </div>
                </div>
                <span className="px-4 py-1.5 font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40">
                  Q0{quarter} DIRECTIVE RATIFIED
                </span>
              </div>

              <div className="market-cluster-body">
                <div className="flex flex-col gap-4">
                  <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">
                    PUBLISHED DIRECTIVE • RECONNAISSANCE &amp; MARKETING WIRE
                  </span>
                  <h1 className="text-2xl font-bold font-sans text-white tracking-wide leading-snug m-0">
                    {deptLocks?.market?.headline ||
                      deptLocks?.market?.summary ||
                      "EXECUTIVE DIRECTIVE RATIFIED AND EXECUTED"}
                  </h1>

                  {deptLocks?.market?.press ? (
                    <p className="text-base text-slate-200 leading-relaxed font-sans italic border-l-4 border-emerald-500/60 pl-5 my-3 bg-black/40 p-3">
                      “{deptLocks.market.press}”
                    </p>
                  ) : (
                    <p className="text-sm text-slate-200 leading-relaxed font-mono bg-black/40 p-3">
                      {deptLocks?.market?.summary}
                    </p>
                  )}

                  {/* KPI Deltas Pill Grid if Available */}
                  {deptLocks?.market?.stat_deltas && (
                    <div className="mt-3 pt-4 border-t border-slate-800 flex flex-wrap gap-2.5 text-xs font-mono">
                      {Object.entries(deptLocks.market.stat_deltas).map(([kpi, val]) => (
                        <span
                          key={kpi}
                          className={`px-3 py-1.5 font-bold ${
                            val > 0
                              ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/50"
                              : "bg-red-950/70 text-red-300 border border-red-500/50"
                          }`}
                        >
                          {val > 0 ? `+${val}` : val} {kpi.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Control Bar */}
                <div className="mt-6 pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    QUARTER 0{quarter} STRATEGIC ACTION LOCKED • NO FURTHER ORDERS ACCEPTED THIS QUARTER
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      soundManager.playClick();
                      router.push("/hq");
                    }}
                    className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>RETURN TO HQ →</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}