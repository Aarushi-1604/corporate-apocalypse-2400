"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import {
  useMarket,
  useMarketCascadeScenarios,
  useStrategicDilemmas,
} from "@/lib/hooks/use-market";
import { SystemBar } from "@/components/domain/FigmaCityMap";
import { MarketCascadeGame } from "@/components/domain/MarketCascadeGame";
import { LiveMarketIntelligence } from "@/components/domain/LiveMarketIntelligence";
import { StrategicDecisionStage } from "@/components/domain/StrategicDecisionStage";
import { soundManager } from "@/lib/audio";

type MarketStage =
  | "cmo_briefing"
  | "cascade_training"
  | "live_intelligence"
  | "strategic_decision";

export default function MarketDepartmentPage() {
  const router = useRouter();
  const { data: session, isLoading: isSessionLoading } = useSession();
  const companyId = session?.company_id;
  const quarter = session?.current_quarter ?? 1;

  // Active Stage State: starts at CMO briefing unless already completed
  const [stage, setStage] = useState<MarketStage>("cmo_briefing");
  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);

  // Queries
  const { data: scenarios, isLoading: isScenariosLoading } = useMarketCascadeScenarios();
  const { data: marketData, isLoading: isMarketLoading } = useMarket(companyId);
  const { data: dilemmas, isLoading: isDilemmasLoading } = useStrategicDilemmas(companyId);

  // Check if player already completed cascade training this quarter
  useEffect(() => {
    if (!companyId) return;
    const key = `market_cascade_completed_${companyId}_q${quarter}`;
    const alreadyDone = typeof window !== "undefined" && localStorage.getItem(key) === "true";
    if (alreadyDone) {
      setStage("live_intelligence");
    }
  }, [companyId, quarter]);

  if (isSessionLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest text-sm">
        ESTABLISHING SECURE PROTOCOL // MARKETING & INTELLIGENCE...
      </div>
    );
  }

  const handleBackToHQ = () => {
    router.push("/hq");
  };

  const handleCascadeTrainingFinished = () => {
    if (companyId) {
      const key = `market_cascade_completed_${companyId}_q${quarter}`;
      try {
        localStorage.setItem(key, "true");
      } catch {}
    }
    setStage("live_intelligence");
  };

  const currentScenario = scenarios?.[activeScenarioIdx];
  const activeDilemma = dilemmas?.[0];

  return (
    <main className="screen map-screen market-screen bg-black text-white min-h-screen flex flex-col pt-16">
      {/* 2400 Unified System Bar */}
      <SystemBar
        section="MARKETING & ACQUISITIONS // STRATEGIC RADAR"
        companyName={session.company?.name}
        capital={marketData?.company_cash ?? session.company?.cash}
        onBack={handleBackToHQ}
      />

      <div className="flex-1 overflow-y-auto px-6 pb-12 pt-6">
        {/* Stage 0: CMO Executive Briefing Modal */}
        {stage === "cmo_briefing" && (
          <div className="flex items-center justify-center min-h-[75vh]">
            <section className="w-full max-w-3xl rounded-xl border border-amber-500/40 bg-gradient-to-b from-neutral-950/95 to-neutral-900/95 p-8 backdrop-blur-xl shadow-[0_25px_80px_rgba(0,0,0,0.9)] flex flex-col gap-6 animate-in fade-in duration-300">
              {/* Speaker Persona Header */}
              <div className="flex items-center gap-4 pb-4 border-b border-neutral-800">
                <div className="w-12 h-12 rounded bg-amber-500/10 border border-amber-500 flex items-center justify-center font-mono font-black text-amber-400 text-lg tracking-wider">
                  CMO
                </div>
                <div className="flex flex-col">
                  <span className="text-base font-bold text-white tracking-wide">
                    SARAH CHEN
                  </span>
                  <span className="text-xs font-mono text-amber-500 tracking-widest uppercase">
                    CHIEF MARKETING OFFICER // HEAD OF CORPORATE RECON
                  </span>
                </div>
              </div>

              {/* Briefing Narrative */}
              <p className="text-neutral-200 text-sm leading-relaxed font-serif italic">
                “Welcome to Corporate Reconnaissance, CEO. Before you deploy millions into brand
                expansion or engage in price wars with rival conglomerates, you must master the
                anatomy of a <strong>Market Cascade</strong>. Macroeconomic shocks don&apos;t happen in isolation—a
                single shift in interest rates or crude oil triggers an immediate chain reaction through debt,
                procurement, margins, and consumer demand. Trace the causality correctly, and you will outmaneuver
                every competitor in New Kalki City.”
              </p>

              {/* 3 Pillar Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3.5 rounded bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="text-amber-400 font-bold">01. TRACE THE SHOCK</span>
                  <p className="text-neutral-400 leading-normal">
                    Drag cards from origin shock [1] to downstream market consequence [5].
                  </p>
                </div>
                <div className="p-3.5 rounded bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="text-amber-400 font-bold">02. CAUSAL PRECEDENCE</span>
                  <p className="text-neutral-400 leading-normal">
                    Deterministic grading evaluates the underlying transmission graph.
                  </p>
                </div>
                <div className="p-3.5 rounded bg-neutral-900/60 border border-neutral-800 flex flex-col gap-1.5">
                  <span className="text-amber-400 font-bold">03. STRATEGIC CALL</span>
                  <p className="text-neutral-400 leading-normal">
                    Apply intelligence to real corporate state decisions and press impact.
                  </p>
                </div>
              </div>

              {/* Action Button */}
              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    soundManager.playSuccess();
                    setStage("cascade_training");
                  }}
                  className="px-8 py-3.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-black font-mono tracking-widest flex items-center gap-3 shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer"
                >
                  <span>[ INITIALIZE CASCADE PROTOCOL ]</span>
                  <span>→</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* Stage 1: Market Cascade Training */}
        {stage === "cascade_training" && (
          <div>
            {isScenariosLoading || !currentScenario ? (
              <div className="flex h-96 items-center justify-center font-mono text-neutral-400">
                LOADING MARKET CASCADE PROTOCOLS...
              </div>
            ) : (
              <MarketCascadeGame
                scenario={currentScenario}
                scenarioIndex={activeScenarioIdx}
                totalScenarios={scenarios.length}
                onEvaluationComplete={() => {}}
                onContinue={() => {
                  if (activeScenarioIdx < scenarios.length - 1) {
                    setActiveScenarioIdx((prev) => prev + 1);
                  } else {
                    handleCascadeTrainingFinished();
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Stage 2: Live Corporate Intelligence */}
        {stage === "live_intelligence" && (
          <div>
            {isMarketLoading || !marketData ? (
              <div className="flex h-96 items-center justify-center font-mono text-neutral-400">
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
          <div>
            {isDilemmasLoading || !activeDilemma || !companyId ? (
              <div className="flex h-96 items-center justify-center font-mono text-neutral-400">
                LOADING STRATEGIC BRIEF...
              </div>
            ) : (
              <StrategicDecisionStage
                dilemma={activeDilemma}
                quarter={quarter}
                companyId={companyId}
                onDecisionExecuted={() => {}}
                onBackToIntel={() => setStage("live_intelligence")}
              />
            )}
          </div>
        )}
      </div>
    </main>
  );
}