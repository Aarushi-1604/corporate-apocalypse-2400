"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import {
  useNegotiationSession,
  useAdvanceDiscovery,
  usePursueOrReject,
  useSubmitPitch,
  useSubmitPriceQuote,
  PitchEvaluationResult,
  DealResolutionResult,
} from "@/lib/hooks/use-client-negotiation";
import { SystemBar } from "@/components/domain/FigmaCityMap";
import { soundManager } from "@/lib/audio";

export default function ClientsNegotiationPage() {
  const router = useRouter();
  const { data: session, isLoading: isSessionLoading } = useSession();
  const companyId = session?.company_id;
  const quarter = session?.current_quarter ?? 1;

  const { data: negSession, isLoading: isNegLoading } = useNegotiationSession(companyId);

  // Local interaction state
  const [pitchText, setPitchText] = useState("");
  const [priceInput, setPriceInput] = useState<string>("");
  const [evaluation, setEvaluation] = useState<PitchEvaluationResult | null>(null);
  const [resolution, setResolution] = useState<DealResolutionResult | null>(null);
  const [showDossier, setShowDossier] = useState(true);

  // Mutations
  const advanceDiscoveryMutation = useAdvanceDiscovery(negSession?.contract_id ?? "", companyId);
  const pursueOrRejectMutation = usePursueOrReject(negSession?.contract_id ?? "", companyId);
  const submitPitchMutation = useSubmitPitch(negSession?.contract_id ?? "", companyId);
  const submitPriceQuoteMutation = useSubmitPriceQuote(negSession?.contract_id ?? "", companyId);

  // Pre-fill suggested price quote once budget or multiplier is known
  useEffect(() => {
    if (negSession?.scenario && !priceInput) {
      setPriceInput(negSession.scenario.stage_2_discovery.budget_expectation.toString());
    }
  }, [negSession?.scenario]);

  const handleBackToCity = () => {
    router.push("/city");
  };

  const handleTellMeMore = async () => {
    soundManager.playClick();
    await advanceDiscoveryMutation.mutateAsync("tell_me_more");
    soundManager.playSuccess();
  };

  const handleDeclineInitial = async () => {
    soundManager.playAlert();
    await advanceDiscoveryMutation.mutateAsync("decline");
  };

  const handlePursue = async () => {
    soundManager.playClick();
    await pursueOrRejectMutation.mutateAsync("pursue");
    soundManager.playSuccess();
  };

  const handleRejectDiscovery = async () => {
    soundManager.playAlert();
    await pursueOrRejectMutation.mutateAsync("reject");
  };

  const handleSubmitPitch = async () => {
    if (!pitchText.trim() || submitPitchMutation.isPending) return;
    soundManager.playClick();
    try {
      const res = await submitPitchMutation.mutateAsync(pitchText.trim());
      setEvaluation(res);
      // Auto-set suggested price
      if (negSession?.scenario) {
        const base = negSession.scenario.stage_2_discovery.budget_expectation;
        const adjusted = Math.round(base * res.suggested_price_multiplier);
        setPriceInput(adjusted.toString());
      }
      soundManager.playSuccess();
    } catch {
      soundManager.playAlert();
    }
  };

  const handleProceedToQuoting = () => {
    soundManager.playClick();
  };

  const handleSubmitQuote = async () => {
    const numericPrice = parseFloat(priceInput);
    if (isNaN(numericPrice) || numericPrice <= 0 || submitPriceQuoteMutation.isPending) return;
    soundManager.playClick();
    try {
      const res = await submitPriceQuoteMutation.mutateAsync({
        quoted_price: numericPrice,
        pitch_score: evaluation?.score ?? 60,
      });
      setResolution(res);
      if (res.outcome === "ACCEPTED" || res.outcome === "COUNTEROFFER") {
        soundManager.playSuccess();
      } else {
        soundManager.playAlert();
      }
    } catch {
      soundManager.playAlert();
    }
  };

  if (isSessionLoading || isNegLoading || !negSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#040308] text-purple-400 font-mono tracking-widest">
        OPENING SECURE CLIENT COMMUNICATIONS LINK...
      </div>
    );
  }

  const { scenario, status, relationship_score, is_locked } = negSession;

  // Determine active visual stage
  const isRequirementStage = status === "stage_1_requirement" || status === "incoming";
  const isDiscoveryStage = status === "stage_2_discovery";
  const isPitchStage = status === "stage_4_pitch";
  const isReactionStage = status === "stage_5_reaction" || Boolean(evaluation);
  const isClosed = status === "closed_won" || status === "closed_lost" || Boolean(resolution);

  return (
    <main className="client-screen-container">
      {/* 2400 Unified System Bar */}
      <SystemBar
        section={`CLIENT WORLD // Q0${quarter} COMMERCIAL NEGOTIATIONS`}
        companyName={session?.company?.name}
        capital={session?.company?.cash}
        onBack={handleBackToCity}
      />

      {/* Futuristic Command Banner (Electric Purple HUD) */}
      <section className="client-command-banner">
        <div className="market-hud-left">
          <div className="market-label-group">
            <span style={{ color: "#a855f7" }}>COMMERCIAL ACQUISITIONS // B2B PROCUREMENT</span>
            <strong>CLIENT WORLD NEGOTIATION</strong>
          </div>

          <div className="market-split-stats">
            <div>
              <small>ACTIVE QUARTER</small>
              <b>Q0{quarter}</b>
            </div>
            <div>
              <small>CLIENT TRUST</small>
              <b style={{ color: "#c084fc" }}>
                {evaluation ? evaluation.new_relationship_score.toFixed(0) : relationship_score.toFixed(0)}%
              </b>
            </div>
            <div>
              <small>ENGAGEMENT STATUS</small>
              <b
                style={{
                  color: isClosed ? "#34d399" : isReactionStage ? "#f59e0b" : "#a855f7",
                }}
              >
                {isClosed ? "DEAL RESOLVED" : isReactionStage ? "QUOTE PENDING" : isPitchStage ? "PITCH ACTIVE" : "DISCOVERY"}
              </b>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="market-gauge-box">
          <div className="market-gauge-track">
            <div
              className="client-gauge-fill"
              style={{
                width: isClosed
                  ? "100%"
                  : isReactionStage
                  ? "80%"
                  : isPitchStage
                  ? "55%"
                  : isDiscoveryStage
                  ? "35%"
                  : "15%",
              }}
            />
          </div>
          <div className="market-gauge-footer">
            <span>REQUIREMENT</span>
            <span>DISCOVERY</span>
            <span>PITCH</span>
            <span>EVALUATION</span>
            <span>RESOLVED</span>
          </div>
        </div>

        {/* Global Exit Action */}
        <div className="capital-hud-actions">
          <button className="reset-alloc-btn" onClick={handleBackToCity} type="button">
            RETURN TO CITY
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-6 pb-12 pt-4">
        {/* ====================================================================
            LOCKED OR PASSIVE STATE (e.g. Q3/Q4 or missing prerequisites)
           ==================================================================== */}
        {/* ====================================================================
            PASSIVE PORTFOLIO DASHBOARD (Q3 & Q4)
           ==================================================================== */}
        {(status === "PASSIVE_PORTFOLIO" || (quarter > 2 && Boolean(negSession.active_portfolio))) && (
          <div className="flex flex-col gap-6 w-full py-4 max-w-5xl mx-auto animate-in fade-in duration-200">
            {/* Header Cluster */}
            <div className="client-content-cluster !m-0 !max-w-none w-full border border-purple-500/50 bg-black/95 p-6 flex flex-col gap-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-900/50">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-purple-300 bg-purple-950/80 border border-purple-500/50 px-2.5 py-1 font-bold tracking-wider">
                      PASSIVE CLIENT EXPERIENCE // Q0{quarter}
                    </span>
                    <span className="font-mono text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 font-bold">
                      SLA FULFILLMENT &amp; MAINTENANCE
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold font-mono text-white mt-2 m-0 tracking-wide">
                    ACTIVE ENTERPRISE CLIENT PORTFOLIO
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleBackToCity}
                    className="game-button px-5 py-2 text-xs font-mono font-bold tracking-widest text-slate-300 border border-slate-700 bg-neutral-900 cursor-pointer"
                  >
                    <span>DISTRICT MAP</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/hq")}
                    className="game-button gold px-6 py-2 text-xs font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>RETURN TO HQ →</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-300 font-sans leading-relaxed m-0">
                New commercial client negotiations are closed for Quarter 0{quarter}. All enterprise revenue is driven passively by active multi-quarter agreements secured during Q1 and Q2. Operational focus is directed toward ongoing SLA compliance, client trust retention, and dispute mitigation.
              </p>

              {/* Portfolio Key Metrics Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 bg-purple-950/20 border border-purple-900/40 font-mono text-xs">
                <div className="flex flex-col">
                  <span className="text-[10px] text-purple-400 font-bold">ACTIVE CONTRACTS</span>
                  <strong className="text-lg font-bold text-white">
                    {negSession.total_active_contracts ?? (negSession.active_portfolio?.filter((c) => c.status === "closed_won").length ?? 0)}
                  </strong>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-purple-400 font-bold">TOTAL CONTRACT VALUE</span>
                  <strong className="text-lg font-bold text-amber-400">
                    ₹{(negSession.total_contract_value ?? 0).toLocaleString()}
                  </strong>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-purple-400 font-bold">PASSIVE QUARTERLY REVENUE</span>
                  <strong className="text-lg font-bold text-emerald-400">
                    +₹{(negSession.total_ongoing_quarterly_revenue ?? 0).toLocaleString()} / QTR
                  </strong>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-purple-400 font-bold">PORTFOLIO HEALTH</span>
                  <strong className="text-lg font-bold text-purple-300">
                    {negSession.relationship_score ? `${negSession.relationship_score.toFixed(0)}% TRUST` : "NOMINAL"}
                  </strong>
                </div>
              </div>
            </div>

            {/* Individual Carried Forward Client Cards */}
            <div className="flex flex-col gap-4">
              <span className="font-mono text-xs text-purple-400 uppercase tracking-widest font-bold">
                PERSISTED CLIENT CONTRACTS ON RECORD
              </span>

              {negSession.active_portfolio && negSession.active_portfolio.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {negSession.active_portfolio.map((contract) => {
                    const isWon = contract.status === "closed_won";
                    return (
                      <div
                        key={contract.id || contract.client_name}
                        className={`p-5 border flex flex-col justify-between gap-4 bg-neutral-950/90 ${
                          isWon ? "border-purple-500/50" : "border-slate-800 opacity-60"
                        }`}
                      >
                        <div className="flex flex-col gap-2.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[10px] text-purple-300 bg-purple-950/70 border border-purple-500/40 px-2 py-0.5 font-bold uppercase tracking-wider">
                              SIGNED Q0{contract.quarter_signed} • {contract.client_type}
                            </span>
                            <span
                              className={`font-mono text-[10px] px-2 py-0.5 font-bold uppercase ${
                                isWon
                                  ? "bg-emerald-950/70 text-emerald-300 border border-emerald-500/40"
                                  : "bg-red-950/70 text-red-300 border border-red-500/40"
                              }`}
                            >
                              {isWon ? "ACTIVE ACCOUNT" : "CLOSED / TERMINATED"}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold font-sans text-white m-0">
                            {contract.client_name}
                          </h3>

                          <p className="text-xs text-slate-300 font-mono leading-relaxed m-0">
                            {contract.summary}
                          </p>

                          <div className="p-3 bg-black/80 border border-slate-800 flex flex-col gap-1.5 text-xs font-mono">
                            <div className="flex justify-between items-center text-slate-400">
                              <span>BASE DEAL VALUE:</span>
                              <strong className="text-white">₹{contract.value.toLocaleString()}</strong>
                            </div>
                            {isWon && (
                              <div className="flex justify-between items-center text-slate-400">
                                <span>ONGOING Q{quarter} REVENUE:</span>
                                <strong className="text-emerald-400">+₹{contract.ongoing_quarterly_revenue.toLocaleString()}</strong>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-slate-400">
                              <span>CLIENT TRUST SCORE:</span>
                              <strong className={contract.relationship_score >= 50 ? "text-purple-300" : "text-amber-400"}>
                                {contract.relationship_score.toFixed(0)}%
                              </strong>
                            </div>
                          </div>

                          {/* Obligations & Disputes */}
                          <div className="flex flex-col gap-1 text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-purple-400 font-bold">OBLIGATION:</span>
                              <span>{contract.obligation}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <span className="text-amber-400 font-bold">DISPUTE STATUS:</span>
                              <span className={contract.dispute_status.includes("NOMINAL") ? "text-emerald-400" : "text-red-400 font-bold"}>
                                {contract.dispute_status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 border border-slate-800 bg-neutral-950 text-center font-mono text-sm text-slate-400">
                  NO PREVIOUS CLIENT AGREEMENTS WERE SECURED IN QUARTERS 1 OR 2.
                  <p className="text-xs text-slate-500 mt-2">
                    Commercial accounts remain idle for Quarter 0{quarter}.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOCKED STATE (e.g. Q1/Q2 missing prerequisites) */}
        {status === "LOCKED" && quarter <= 2 && (
          <div className="flex flex-col gap-6 w-full py-8 max-w-2xl mx-auto animate-in fade-in duration-200">
            <div className="client-content-cluster !m-0 !max-w-none w-full border border-purple-500/40 bg-black/90 p-8 flex flex-col gap-6 text-center items-center">
              <span className="font-mono text-sm text-amber-400 bg-amber-950/60 border border-amber-500/40 px-4 py-2 font-bold tracking-wider">
                ACCESS RESTRICTED // CLIENT PORTAL
              </span>
              <h2 className="text-2xl font-bold font-mono text-white tracking-wide">
                CLIENT OFFICE RESTRICTED
              </h2>
              <p className="text-slate-300 font-sans text-base leading-relaxed max-w-lg">
                {negSession.lock_reason ??
                  "Complete Finance & Operations, Marketing, and R&D before negotiating with clients."}
              </p>
              <button
                type="button"
                onClick={handleBackToCity}
                className="game-button gold px-8 py-3 text-sm font-mono font-bold tracking-widest cursor-pointer mt-4"
              >
                <span>RETURN TO CITY MAP →</span>
              </button>
            </div>
          </div>
        )}

        {/* ====================================================================
            STAGE 1: INITIAL CLIENT REQUIREMENT
           ==================================================================== */}
        {status !== "LOCKED" && isRequirementStage && !isClosed && (
          <div className="flex flex-col gap-6 w-full py-2 animate-in fade-in duration-200">
            <div className="client-content-cluster !m-0 !max-w-none w-full">
              <div className="client-cluster-header">
                <div className="market-cluster-header-left">
                  <div className="client-cluster-accent-bar" />
                  <div>
                    <h2 className="market-cluster-title">
                      {scenario.client_name.toUpperCase()} // COMMERCIAL INQUIRY
                    </h2>
                    <span className="market-cluster-subline">
                      {scenario.executive_contact} • {scenario.executive_title}
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm text-purple-300 bg-purple-950/60 border border-purple-500/40 px-3.5 py-1.5 font-bold">
                  STAGE 01 // INITIAL INQUIRY
                </span>
              </div>

              <div className="market-cluster-body">
                <div className="p-4 bg-purple-950/20 border border-purple-500/30 text-sm font-mono text-purple-300 uppercase font-bold tracking-wider">
                  MANDATE: {scenario.headline}
                </div>

                <div className="p-6 bg-black/80 border border-slate-800 text-slate-100 text-lg md:text-xl leading-relaxed font-sans">
                  “{scenario.stage_1_requirement}”
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <span className="text-sm font-mono text-slate-400">
                    EVALUATE CLIENT INQUIRY BEFORE COMMITTING EXECUTIVE RESOURCES.
                  </span>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      disabled={advanceDiscoveryMutation.isPending}
                      onClick={handleDeclineInitial}
                      className="px-6 py-3 border border-slate-700 bg-neutral-900 hover:border-red-500 text-sm font-mono text-slate-300 hover:text-red-300 font-bold tracking-widest cursor-pointer"
                    >
                      DECLINE OPPORTUNITY ✕
                    </button>
                    <button
                      type="button"
                      disabled={advanceDiscoveryMutation.isPending}
                      onClick={handleTellMeMore}
                      className="game-button gold px-8 py-3 text-sm font-mono font-bold tracking-widest cursor-pointer"
                    >
                      <span>TELL ME MORE →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STAGE 2 & 3: DISCOVERY & PURSUE / REJECT
           ==================================================================== */}
        {isDiscoveryStage && !isClosed && (
          <div className="flex flex-col gap-6 w-full py-2 animate-in fade-in duration-200">
            <div className="client-content-cluster !m-0 !max-w-none w-full">
              <div className="client-cluster-header">
                <div className="market-cluster-header-left">
                  <div className="client-cluster-accent-bar" />
                  <div>
                    <h2 className="market-cluster-title">
                      {scenario.client_name.toUpperCase()} // DETAILED DISCOVERY
                    </h2>
                    <span className="market-cluster-subline">
                      DELIVERABLES, BUDGET GUIDELINES &amp; CONSTRAINTS
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm text-purple-300 bg-purple-950/60 border border-purple-500/40 px-3.5 py-1.5 font-bold">
                  STAGE 02 // TECHNICAL DISCOVERY
                </span>
              </div>

              <div className="market-cluster-body">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1.5">
                    <span className="text-sm font-mono text-slate-400 font-semibold">TARGET TIMELINE</span>
                    <strong className="text-base font-sans text-white">{scenario.stage_2_discovery.timeline}</strong>
                  </div>
                  <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1.5">
                    <span className="text-sm font-mono text-slate-400 font-semibold">EXPECTED BUDGET</span>
                    <strong className="text-2xl font-mono text-emerald-400 font-bold">
                      {scenario.stage_2_discovery.budget_range_text}
                    </strong>
                  </div>
                  <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1.5">
                    <span className="text-sm font-mono text-slate-400 font-semibold">CLIENT PROFILE</span>
                    <span className="text-sm font-mono text-purple-300 leading-snug">{scenario.stage_2_discovery.personality_notes}</span>
                  </div>
                </div>

                <div className="p-5 bg-neutral-950 border border-slate-800 flex flex-col gap-2.5">
                  <span className="text-sm font-mono text-purple-400 font-bold uppercase tracking-wider">
                    REQUIRED DELIVERABLES:
                  </span>
                  <p className="text-base md:text-lg text-slate-100 leading-relaxed font-sans m-0">
                    {scenario.stage_2_discovery.deliverables}
                  </p>
                </div>

                <div className="p-4 bg-black/60 border border-slate-800 flex flex-col gap-1.5 text-sm font-mono text-slate-200">
                  <strong className="text-amber-400 text-sm">OPERATIONAL CONSTRAINTS:</strong>
                  <span className="text-sm leading-relaxed">{scenario.stage_2_discovery.constraints}</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
                  <span className="text-sm font-mono text-slate-400">
                    STAGE 03: DECIDE WHETHER TO PURSUE OR REJECT THIS COMMERCIAL BID.
                  </span>

                  <div className="flex gap-4">
                    <button
                      type="button"
                      disabled={pursueOrRejectMutation.isPending}
                      onClick={handleRejectDiscovery}
                      className="px-6 py-3 border border-slate-700 bg-neutral-900 hover:border-red-500 text-sm font-mono text-slate-300 hover:text-red-300 font-bold tracking-widest cursor-pointer"
                    >
                      REJECT OPPORTUNITY ✕
                    </button>
                    <button
                      type="button"
                      disabled={pursueOrRejectMutation.isPending}
                      onClick={handlePursue}
                      className="game-button gold px-8 py-3 text-sm font-mono font-bold tracking-widest cursor-pointer"
                    >
                      <span>PURSUE OPPORTUNITY →</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STAGE 4: PITCH SUBMISSION (WHY SHOULD WE CHOOSE YOU?)
           ==================================================================== */}
        {isPitchStage && !evaluation && !isClosed && (
          <div className="flex flex-col gap-6 w-full py-2 animate-in fade-in duration-200">
            <div className="client-content-cluster !m-0 !max-w-none w-full">
              <div className="client-cluster-header">
                <div className="market-cluster-header-left">
                  <div className="client-cluster-accent-bar" />
                  <div>
                    <h2 className="market-cluster-title">
                      STAGE 04 // EXECUTIVE COMMERCIAL PITCH
                    </h2>
                    <span className="market-cluster-subline">
                      {scenario.client_name.toUpperCase()} • BID EVALUATION
                    </span>
                  </div>
                </div>
                <span className="font-mono text-sm text-purple-300 bg-purple-950/60 border border-purple-500/40 px-3.5 py-1.5 font-bold">
                  AI EVALUATOR ACTIVE
                </span>
              </div>

              <div className="market-cluster-body">
                <div className="p-6 bg-black/80 border border-slate-800 flex flex-col gap-2.5">
                  <span className="text-sm font-mono text-purple-400 font-bold uppercase tracking-wider">
                    {scenario.executive_contact.toUpperCase()} ASKS:
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold font-sans text-white m-0">
                    “Why should we choose your company over rival conglomerates?”
                  </h3>
                  <p className="text-sm text-slate-300 font-mono m-0 mt-1 leading-relaxed">
                    Your pitch will be evaluated on technical relevance to our deliverables, company capabilities, and operational credibility. Avoid wild over-promising.
                  </p>
                </div>

                {/* Collapsible / Interactive Client Requirements & Deliverables Dossier */}
                <div className="border border-purple-500/40 bg-purple-950/20 p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
                      <span className="text-sm font-mono font-bold tracking-wider text-purple-200 uppercase">
                        CLIENT SPECIFICATION &amp; DELIVERABLES DOSSIER
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDossier((prev) => !prev)}
                      className="px-3.5 py-1.5 bg-black/60 border border-purple-500/50 hover:border-purple-300 text-xs font-mono text-purple-300 hover:text-white uppercase transition-colors"
                    >
                      {showDossier ? "HIDE SPECIFICATION ▲" : "VIEW REQUIREMENTS & DELIVERABLES ▼"}
                    </button>
                  </div>

                  {showDossier && (
                    <div className="mt-4 pt-4 border-t border-purple-900/50 flex flex-col gap-4 text-sm font-mono animate-in fade-in duration-150">
                      {/* Mandate & Requirement */}
                      <div className="p-4 bg-black/60 border border-slate-800">
                        <span className="text-purple-400 font-bold block mb-1 text-xs sm:text-sm tracking-wide">
                          STATED MANDATE &amp; REQUIREMENT:
                        </span>
                        <p className="font-sans text-slate-100 text-base md:text-lg leading-relaxed m-0">
                          “{scenario.stage_1_requirement}”
                        </p>
                      </div>

                      {/* Required Deliverables */}
                      <div className="p-4 bg-black/60 border border-slate-800">
                        <span className="text-purple-400 font-bold block mb-1 text-xs sm:text-sm tracking-wide">
                          REQUIRED DELIVERABLES:
                        </span>
                        <p className="font-sans text-slate-100 text-base md:text-lg leading-relaxed m-0">
                          {scenario.stage_2_discovery.deliverables}
                        </p>
                      </div>

                      {/* Timeline, Budget, and Constraints */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                        <div className="p-3 bg-black/60 border border-slate-800">
                          <span className="text-slate-400 block text-xs font-mono mb-0.5">TIMELINE</span>
                          <span className="font-sans text-white text-sm sm:text-base font-semibold">
                            {scenario.stage_2_discovery.timeline}
                          </span>
                        </div>
                        <div className="p-3 bg-black/60 border border-slate-800">
                          <span className="text-slate-400 block text-xs font-mono mb-0.5">BUDGET GUIDELINE</span>
                          <span className="font-mono text-emerald-400 text-sm sm:text-base font-bold">
                            {scenario.stage_2_discovery.budget_range_text}
                          </span>
                        </div>
                        <div className="p-3 bg-black/60 border border-slate-800">
                          <span className="text-amber-400 block text-xs font-mono mb-0.5">OPERATIONAL CONSTRAINTS</span>
                          <span className="font-mono text-slate-200 text-xs sm:text-sm leading-snug">
                            {scenario.stage_2_discovery.constraints}
                          </span>
                        </div>
                      </div>

                      {/* Technical Pitch Hints for Students */}
                      {scenario.pitch_hints && scenario.pitch_hints.length > 0 && (
                        <div className="p-4 bg-indigo-950/30 border border-indigo-500/40 flex flex-col gap-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-mono font-bold text-indigo-300 uppercase tracking-wider">
                              💡 EXECUTIVE BRIEFING HINTS // KEY PROPOSAL TALKING POINTS:
                            </span>
                          </div>
                          <ul className="list-disc pl-5 m-0 space-y-1.5 text-sm font-mono text-indigo-100 leading-relaxed">
                            {scenario.pitch_hints.map((hint, i) => (
                              <li key={i}>{hint}</li>
                            ))}
                          </ul>
                          <span className="text-xs font-mono text-slate-400">
                            (Touch upon these engineering and operational topics in your proposal below to secure a passing score of 70+!)
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Hint Chips & Auto-Draft Helper */}
                {scenario.pitch_hints && scenario.pitch_hints.length > 0 && (
                  <div className="flex flex-col gap-2.5 p-3.5 bg-black/60 border border-purple-800/60">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
                        ⚡ QUICK PROPOSAL BUILDER:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const hints = scenario.pitch_hints ?? [];
                          const autoDraft = `We propose deploying our institutional solutions for ${scenario.client_name}. ` +
                            hints.join(" ") +
                            ` Our engineering architecture fulfills all operational constraints and guarantees delivery on schedule.`;
                          setPitchText(autoDraft);
                        }}
                        className="px-3 py-1.5 text-xs font-mono font-bold text-emerald-300 hover:text-white bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-600 rounded cursor-pointer transition-colors"
                      >
                        ✨ AUTO-DRAFT COMPLETE PROPOSAL
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] font-mono text-slate-400 uppercase">
                        CLICK TO INSERT TALKING POINT:
                      </span>
                      {scenario.pitch_hints.map((hint, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setPitchText((prev) => (prev ? `${prev} ${hint}` : hint));
                          }}
                          className="px-3 py-1.5 text-xs font-mono text-purple-200 hover:text-white bg-purple-950/70 hover:bg-purple-900 border border-purple-600 rounded transition-colors text-left cursor-pointer"
                        >
                          + Point {idx + 1}: {hint.slice(0, 38)}...
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Free text pitch textarea */}
                <div className="flex flex-col gap-2.5">
                  <label className="text-sm font-mono text-slate-200 font-bold tracking-wide">
                    ENTER EXECUTIVE PROPOSAL (MAX 1,500 CHARACTERS):
                  </label>
                  <textarea
                    rows={6}
                    value={pitchText}
                    onChange={(e) => setPitchText(e.target.value)}
                    placeholder="Describe your technical architecture, delivery milestones, team expertise, and why your solution fulfills our constraints..."
                    className="w-full p-4 bg-black/90 border border-purple-900/60 focus:border-purple-400 rounded-none text-white text-base font-sans leading-relaxed outline-none resize-none"
                  />
                  <div className="flex justify-between text-sm font-mono text-slate-400">
                    <span>Capabilities context: Innovation {negSession.company_capabilities.innovation.toFixed(0)} • Brand {negSession.company_capabilities.brand.toFixed(0)}</span>
                    <span>{pitchText.length} / 1,500 chars</span>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    disabled={!pitchText.trim() || submitPitchMutation.isPending}
                    onClick={handleSubmitPitch}
                    className={`game-button gold px-10 py-3.5 text-sm font-mono font-bold tracking-widest ${
                      !pitchText.trim() || submitPitchMutation.isPending ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                    }`}
                  >
                    <span>
                      {submitPitchMutation.isPending ? "EVALUATING COMMERCIAL PITCH..." : "SUBMIT PITCH FOR EVALUATION →"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STAGE 5 & 6: CLIENT REACTION & PRICE QUOTE
           ==================================================================== */}
        {isReactionStage && !isClosed && (
          <div className="flex flex-col gap-6 w-full py-2 animate-in fade-in duration-200">
            {/* Reaction Card */}
            <div className="client-content-cluster !m-0 !max-w-none w-full">
              <div className="client-cluster-header">
                <div className="market-cluster-header-left">
                  <div className="client-cluster-accent-bar" />
                  <div>
                    <h2 className="market-cluster-title">
                      STAGE 05 // CLIENT REACTION &amp; ASSESSMENT
                    </h2>
                    <span className="market-cluster-subline">
                      EVALUATION RESULT • {evaluation?.provider?.toUpperCase() ?? "GROQ"} TELEMETRY
                    </span>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 font-mono text-sm font-bold bg-purple-950/80 border border-purple-500/50 text-purple-300">
                  PITCH SCORE: {evaluation?.score ?? 70} / 100
                </span>
              </div>

              <div className="market-cluster-body">
                {/* Executive Reaction Dialogue */}
                <div className="p-6 bg-black/80 border border-purple-900/50 flex flex-col gap-2.5">
                  <span className="text-sm font-mono text-purple-400 font-bold uppercase tracking-wider">
                    {scenario.executive_contact}’S REACTION:
                  </span>
                  <p className="text-lg md:text-xl text-slate-100 italic font-sans leading-relaxed m-0 border-l-3 border-purple-500 pl-4 py-1.5">
                    “{evaluation?.client_reaction ?? "The client executive listens intently to your pitch and nods in acknowledgement."}”
                  </p>
                </div>

                {/* Score & Trust Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                    <span className="text-sm font-mono text-slate-400 font-semibold">PITCH SCORE</span>
                    <strong className="text-2xl font-bold font-mono text-purple-400">
                      {evaluation?.score ?? 70}%
                    </strong>
                  </div>
                  <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                    <span className="text-sm font-mono text-slate-400 font-semibold">RELATIONSHIP TRUST IMPACT</span>
                    <strong
                      className={`text-2xl font-bold font-mono ${
                        (evaluation?.trust_delta ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {(evaluation?.trust_delta ?? 0) >= 0 ? `+${evaluation?.trust_delta}` : evaluation?.trust_delta} TRUST
                    </strong>
                  </div>
                  <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                    <span className="text-sm font-mono text-slate-400 font-semibold">CLIENT BUDGET GUIDELINE</span>
                    <strong className="text-2xl font-bold font-mono text-white">
                      ₹{scenario.stage_2_discovery.budget_expectation.toLocaleString()}
                    </strong>
                  </div>
                </div>

                {/* STAGE 6: Numeric Price Quoting */}
                <div className="p-6 bg-black/90 border border-purple-800/60 flex flex-col gap-4 mt-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <h3 className="text-base font-bold font-sans text-purple-300 uppercase tracking-wide m-0">
                      STAGE 06 // SUBMIT FINAL COMMERCIAL PRICE QUOTE
                    </h3>
                    <span className="text-sm font-mono text-slate-300">
                      EXPECTATION: {scenario.stage_2_discovery.budget_range_text}
                    </span>
                  </div>

                  <p className="text-sm text-slate-200 font-sans m-0 leading-relaxed">
                    Quote your final total contract price in Indian Rupees (₹). Quoting too high may trigger a counteroffer or rejection; quoting fairly secures acceptance.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4 pt-3">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-xs font-mono text-purple-300 font-bold uppercase tracking-wider">
                        ENTER QUOTED AMOUNT (INR):
                      </label>
                      <div className="flex items-center bg-black/90 border-2 border-purple-600/70 focus-within:border-purple-400 px-4 py-3 shadow-inner">
                        <span className="text-purple-400 font-mono text-xl mr-3 font-bold select-none">₹</span>
                        <input
                          type="number"
                          min={1000}
                          step={500}
                          placeholder="e.g. 24500"
                          value={priceInput}
                          onChange={(e) => setPriceInput(e.target.value)}
                          className="w-full bg-transparent text-white font-mono text-xl md:text-2xl font-bold outline-none placeholder:text-slate-600"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!priceInput || parseFloat(priceInput) <= 0 || submitPriceQuoteMutation.isPending}
                      onClick={handleSubmitQuote}
                      className="game-button gold !w-auto flex-shrink-0 px-8 py-3.5 text-sm font-mono font-bold tracking-widest cursor-pointer whitespace-nowrap min-h-[56px]"
                    >
                      <span>
                        {submitPriceQuoteMutation.isPending ? "FINALIZING DEAL TERMS..." : "RATIFY COMMERCIAL QUOTE →"}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            STAGE 7: DEAL RESOLUTION & FINAL CONSEQUENCE REPORT
           ==================================================================== */}
        {isClosed && (
          <div className="flex flex-col gap-6 w-full py-2 animate-in fade-in duration-200">
            <div className="client-content-cluster !m-0 !max-w-none w-full">
              <div className="client-cluster-header">
                <div className="market-cluster-header-left">
                  <div className="client-cluster-accent-bar" />
                  <div>
                    <h2 className="market-cluster-title">
                      STAGE 07 // COMMERCIAL DEAL RESOLUTION
                    </h2>
                    <span className="market-cluster-subline">
                      {scenario.client_name.toUpperCase()} • Q0{quarter} RESOLUTION
                    </span>
                  </div>
                </div>
                <span
                  className={`px-4 py-2 font-mono text-sm font-bold border ${
                    resolution?.outcome === "ACCEPTED" || resolution?.outcome === "COUNTEROFFER" || status === "closed_won"
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                      : "bg-red-950/80 border-red-500 text-red-300"
                  }`}
                >
                  {resolution?.outcome ?? (status === "closed_won" ? "ACCEPTED" : "DECLINED / REJECTED")}
                </span>
              </div>

              <div className="market-cluster-body">
                {/* Result Headline Banner */}
                <div className="p-6 bg-black/80 border border-slate-800 flex flex-col gap-3">
                  <span className="text-sm font-mono text-purple-400 font-bold uppercase tracking-wider">
                    COMMERCIAL VERDICT:
                  </span>
                  <h3 className="text-xl md:text-2xl font-bold font-sans text-white m-0 leading-relaxed">
                    {resolution?.explanation ?? negSession.decision_summary ?? "Contract negotiation concluded for this quarter."}
                  </h3>
                </div>

                {/* State Impact Breakdown */}
                {resolution && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                    <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                      <span className="text-sm font-mono text-slate-400 font-semibold">FINAL CONTRACT REVENUE</span>
                      <strong className="text-2xl font-bold font-mono text-emerald-400">
                        ₹{resolution.final_revenue.toLocaleString()}
                      </strong>
                    </div>
                    <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                      <span className="text-sm font-mono text-slate-400 font-semibold">LIQUID CASH DELTA</span>
                      <strong className="text-2xl font-bold font-mono text-white">
                        {resolution.stat_deltas.cash ? `+₹${resolution.stat_deltas.cash.toLocaleString()}` : "₹0"}
                      </strong>
                    </div>
                    <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                      <span className="text-sm font-mono text-slate-400 font-semibold">CLIENT SATISFACTION</span>
                      <strong
                        className={`text-2xl font-bold font-mono ${
                          (resolution.stat_deltas.client_satisfaction ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {(resolution.stat_deltas.client_satisfaction ?? 0) >= 0
                          ? `+${resolution.stat_deltas.client_satisfaction}`
                          : resolution.stat_deltas.client_satisfaction}
                      </strong>
                    </div>
                    <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-1.5">
                      <span className="text-sm font-mono text-slate-400 font-semibold">MARKET SHARE DELTA</span>
                      <strong
                        className={`text-2xl font-bold font-mono ${
                          (resolution.stat_deltas.market_share ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {(resolution.stat_deltas.market_share ?? 0) >= 0
                          ? `+${resolution.stat_deltas.market_share}%`
                          : `${resolution.stat_deltas.market_share}%`}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <span className="text-sm font-mono text-slate-400">
                    Q0{quarter} CLIENT ENGAGEMENT RATIFIED • STATE COMMITTED TO ENTERPRISE LEDGER
                  </span>

                  <button
                    type="button"
                    onClick={handleBackToCity}
                    className="game-button gold px-10 py-3.5 text-sm font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>RETURN TO CITY MAP →</span>
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