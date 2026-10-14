"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import { useDepartmentLocks } from "@/lib/hooks/use-company-state";
import { useRdProposal, ExecuteRdDecisionResult } from "@/lib/hooks/use-rd";
import { SystemBar } from "@/components/domain/FigmaCityMap";
import { RdConceptModule } from "@/components/domain/RdConceptModule";
import { RdKnowledgeCheck } from "@/components/domain/RdKnowledgeCheck";
import { ProjectHelixDecisionStage } from "@/components/domain/ProjectHelixDecisionStage";
import { RdConsequenceReport } from "@/components/domain/RdConsequenceReport";
import { soundManager } from "@/lib/audio";

export type RdStage =
  | "cto_briefing"
  | "concept_horizon"
  | "concept_risk_reward"
  | "concept_opportunity_cost"
  | "knowledge_check"
  | "project_helix_decision"
  | "consequence_report"
  | "rd_locked_archive";

export default function ResearchDepartmentPage() {
  const router = useRouter();
  const { data: session, isLoading: isSessionLoading } = useSession();
  const companyId = session?.company_id;
  const quarter = session?.current_quarter ?? 1;

  // Department lock status from backend
  const { data: deptLocks } = useDepartmentLocks(companyId);
  const isRdLocked = Boolean(deptLocks?.rd?.locked);

  const [stage, setStage] = useState<RdStage>("cto_briefing");
  const [decisionResult, setDecisionResult] = useState<ExecuteRdDecisionResult | null>(null);

  // Proposal query
  const { data: proposalData, isLoading: isProposalLoading } = useRdProposal(!!companyId);

  // Check persisted assessment pass state & locked state
  useEffect(() => {
    if (!companyId) return;

    if (isRdLocked) {
      setStage("rd_locked_archive");
      return;
    }

    // Check if player had already completed assessment or in Q2+
    const passKey = `rd_assessment_passed_${companyId}_q${quarter}`;
    const assessmentPassed = typeof window !== "undefined" && localStorage.getItem(passKey) === "true";
    if ((quarter > 1 || assessmentPassed) && stage === "cto_briefing") {
      // Resume to decision stage directly in Q2+ or if assessment already passed
      setStage("project_helix_decision");
    }
  }, [companyId, isRdLocked, quarter, stage]);

  const handleBackToHQ = () => {
    router.push("/hq");
  };

  // Progression handlers
  const handleStartBriefing = () => {
    soundManager.playClick();
    setStage("concept_horizon");
  };

  const handleHorizonComplete = () => {
    soundManager.playSuccess();
    setStage("concept_risk_reward");
  };

  const handleRiskRewardComplete = () => {
    soundManager.playSuccess();
    setStage("concept_opportunity_cost");
  };

  const handleOpportunityCostComplete = () => {
    soundManager.playSuccess();
    setStage("knowledge_check");
  };

  const handleAssessmentPassed = (score: number) => {
    if (companyId) {
      const passKey = `rd_assessment_passed_${companyId}_q${quarter}`;
      try {
        localStorage.setItem(passKey, "true");
        localStorage.setItem(`rd_assessment_score_${companyId}_q${quarter}`, score.toString());
      } catch {}
    }
    soundManager.playSuccess();
    setStage("project_helix_decision");
  };

  const handleReviewConcepts = () => {
    soundManager.playClick();
    setStage("concept_horizon");
  };

  const handleDecisionExecuted = (result: ExecuteRdDecisionResult) => {
    setDecisionResult(result);
    setStage("consequence_report");
  };

  return (
    <main className="rd-screen-container">
      {/* 2400 Unified System Bar */}
      <SystemBar
        section={`RESEARCH & DEVELOPMENT // Q0${quarter} PROJECT GENESIS`}
        companyName={session?.company?.name}
        capital={proposalData?.company_cash ?? session?.company?.cash}
        onBack={handleBackToHQ}
      />

      {/* Futuristic Command Banner */}
      <section className="rd-command-banner">
        <div className="market-hud-left">
          <div className="market-label-group">
            <span style={{ color: "#38bdf8" }}>PROJECT GENESIS // INNOVATION DIVISION</span>
            <strong>RESEARCH &amp; DEVELOPMENT</strong>
          </div>

          <div className="market-split-stats">
            <div>
              <small>ACTIVE QUARTER</small>
              <b>Q0{quarter}</b>
            </div>
            <div>
              <small>INNOVATION CAPACITY</small>
              <b style={{ color: "#00f0ff" }}>
                {decisionResult ? decisionResult.new_innovation.toFixed(1) : "ACTIVE"}
              </b>
            </div>
            <div>
              <small>DIRECTIVE STATUS</small>
              <b
                style={{
                  color:
                    isRdLocked || stage === "consequence_report" || stage === "rd_locked_archive"
                      ? "#34d399"
                      : stage === "project_helix_decision"
                      ? "var(--gold)"
                      : "#38bdf8",
                }}
              >
                {isRdLocked || stage === "consequence_report" || stage === "rd_locked_archive"
                  ? "LOCKED & RATIFIED"
                  : stage === "project_helix_decision"
                  ? "DECISION PENDING"
                  : "THEORY PROTOCOLS"}
              </b>
            </div>
          </div>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="market-gauge-box">
          <div className="market-gauge-track">
            <div
              className="rd-gauge-fill"
              style={{
                width:
                  isRdLocked || stage === "consequence_report" || stage === "rd_locked_archive"
                    ? "100%"
                    : stage === "cto_briefing"
                    ? "14%"
                    : stage === "concept_horizon"
                    ? "28%"
                    : stage === "concept_risk_reward"
                    ? "42%"
                    : stage === "concept_opportunity_cost"
                    ? "56%"
                    : stage === "knowledge_check"
                    ? "70%"
                    : "85%",
              }}
            />
          </div>
          <div className="market-gauge-footer">
            <span>CTO BRIEF</span>
            <span>PRINCIPLES (1-3)</span>
            <span>KNOWLEDGE CHECK</span>
            <span>Q1 DECISION</span>
            <span>RATIFIED</span>
          </div>
        </div>

        {/* Global Exit Action */}
        <div className="capital-hud-actions">
          <button className="reset-alloc-btn" onClick={handleBackToHQ} type="button">
            BACK TO HQ
          </button>
        </div>
      </section>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto px-6 pb-12 pt-4">
        {/* ====================================================================
            PAGE 1: CTO BRIEFING MODAL
           ==================================================================== */}
        {stage === "cto_briefing" && (
          <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <section className="briefing-modal rd relative">
              <div className="briefing-speaker">
                <div className="briefing-avatar">CTO</div>
                <div>
                  <strong>DR. MARCUS VANCE</strong>
                  <span>CHIEF TECHNOLOGY OFFICER // PROJECT GENESIS — INNOVATION DIVISION</span>
                </div>
              </div>

              <p className="briefing-text">
                “CEO, our competitors aren&apos;t waiting for us to catch up. We have research
                opportunities that could improve our technology, increase operational efficiency, or
                give us a competitive advantage. But research is not a guaranteed return. Some
                projects take several quarters to pay off. Others may never become commercially
                viable. Your task is to understand the economics of innovation before you commit
                company resources.”
              </p>

              <div className="p-3 bg-cyan-950/40 border border-cyan-500/40 font-mono text-xs text-cyan-300 font-bold mb-4 tracking-wider">
                OBJECTIVE: UNDERSTAND THE ECONOMICS OF R&amp;D
              </div>

              <div className="briefing-card-grid">
                <div className="briefing-card">
                  <strong>01. INVESTMENT HORIZON</strong>
                  <p>
                    Evaluate delayed productivity payoffs vs immediate quarterly cash drain and balance sheet survival.
                  </p>
                </div>
                <div className="briefing-card">
                  <strong>02. RISK VS REWARD</strong>
                  <p>
                    Distinguish theoretical payoffs from probability of failure, sunk costs, and risk concentration.
                  </p>
                </div>
                <div className="briefing-card">
                  <strong>03. OPPORTUNITY COST</strong>
                  <p>
                    Analyze alternative capital uses given up: marketing, debt reduction, operations, and cash buffers.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={handleStartBriefing}
                  className="game-button gold px-10 py-3.5 text-sm font-mono font-bold tracking-widest cursor-pointer"
                >
                  <span>BEGIN CTO BRIEFING →</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {/* ====================================================================
            PAGE 2: CONCEPT 01 — INVESTMENT HORIZON
           ==================================================================== */}
        {stage === "concept_horizon" && (
          <RdConceptModule
            principleNumber="01"
            title="INVESTMENT HORIZON"
            subtitle="TEMPORAL CAPITAL DYNAMICS & DELAYED GAINS"
            conceptSummary={
              <>
                <p className="m-0 text-white font-medium">
                  <strong>Investment horizon</strong> is the amount of time an investment needs to produce meaningful returns.
                </p>
                <p className="m-0 text-slate-300">
                  An R&amp;D project may consume cash today but improve productivity, technology, or competitiveness over several future quarters. A fall in immediate profit does not automatically make the investment bad. However, a long horizon also means the company must be able to survive while waiting for returns.
                </p>
              </>
            }
            infographic={
              <div className="p-5 bg-neutral-950 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    ILLUSTRATIVE TIMELINE: SHORT-TERM EXPENDITURE VS LONG-TERM HORIZON
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 italic">
                    *Illustrative educational model • Not real-time balance sheet calculation
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="p-3.5 border border-red-500/50 bg-red-950/20 flex flex-col gap-1">
                    <span className="text-xs font-mono text-red-400 font-bold">QUARTER 01 (TODAY)</span>
                    <strong className="text-sm font-sans text-white">Initial R&amp;D Outlay</strong>
                    <span className="text-xs font-mono text-red-300">-₹5 Lakh Cash Incurred</span>
                    <p className="text-[11px] text-slate-400 m-0 mt-1">Immediate profit dips. Core tech deployed.</p>
                  </div>

                  <div className="p-3.5 border border-slate-800 bg-black/60 flex flex-col gap-1">
                    <span className="text-xs font-mono text-slate-400 font-bold">QUARTER 02 (INCUBATION)</span>
                    <strong className="text-sm font-sans text-white">System Testing</strong>
                    <span className="text-xs font-mono text-slate-400">₹0 Immediate Revenue</span>
                    <p className="text-[11px] text-slate-400 m-0 mt-1">Integration phase. Cash runway required.</p>
                  </div>

                  <div className="p-3.5 border border-cyan-800/60 bg-cyan-950/20 flex flex-col gap-1">
                    <span className="text-xs font-mono text-cyan-400 font-bold">QUARTER 03 (SCALE)</span>
                    <strong className="text-sm font-sans text-white">Process Efficiency</strong>
                    <span className="text-xs font-mono text-cyan-300">+15% Ops Productivity</span>
                    <p className="text-[11px] text-slate-400 m-0 mt-1">Operational costs begin declining.</p>
                  </div>

                  <div className="p-3.5 border border-emerald-500/50 bg-emerald-950/20 flex flex-col gap-1">
                    <span className="text-xs font-mono text-emerald-400 font-bold">QUARTER 04 (PAYOFF)</span>
                    <strong className="text-sm font-sans text-white">Compounding Moat</strong>
                    <span className="text-xs font-mono text-emerald-300">+25% Profit Compounding</span>
                    <p className="text-[11px] text-slate-400 m-0 mt-1">Long-term competitive advantage achieved.</p>
                  </div>
                </div>

                <div className="p-3 bg-black border border-slate-800 text-xs font-mono text-slate-300 flex items-center justify-between">
                  <span>KEY PRINCIPLE: Projected benefits are estimates, not guaranteed outcomes. Company must survive the wait.</span>
                </div>
              </div>
            }
            questions={[
              {
                question:
                  "A research project costs ₹5 lakh now but may improve productivity over the next three quarters. Is it automatically a bad investment because Q1 profit falls?",
                correctAnswer: false,
                explanation:
                  "Immediate profit is only one part of the evaluation. Future benefits, uncertainty, and affordability also matter.",
              },
              {
                question:
                  "A project promises immediate returns, but there is no supporting evidence. Should the company assume those returns are guaranteed?",
                correctAnswer: false,
                explanation:
                  "Projected returns are not guaranteed. Evaluate the evidence and uncertainty.",
              },
            ]}
            completedBadge="INVESTMENT HORIZON // REVIEWED"
            continueButtonLabel="CONTINUE TO RISK ANALYSIS"
            onContinue={handleHorizonComplete}
          />
        )}

        {/* ====================================================================
            PAGE 3: CONCEPT 02 — RISK VS REWARD
           ==================================================================== */}
        {stage === "concept_risk_reward" && (
          <RdConceptModule
            principleNumber="02"
            title="RISK VS REWARD"
            subtitle="UNCERTAINTY, FAILURE PROBABILITY & ASYMMETRIC OUTCOMES"
            conceptSummary={
              <>
                <p className="m-0 text-white font-medium">
                  R&amp;D investments have uncertain outcomes. A project with a potentially large payoff may also have a low probability of success. A more expensive or technologically advanced project is not automatically a better investment.
                </p>
                <p className="m-0 text-slate-300">
                  Every executive must account for research failure and sunk costs: money spent on an unviable technology cannot be recovered. Prudent leaders diversify risks rather than concentrating all liquid capital into a single fragile moonshot, and must carefully weigh current corporate solvency before accepting elevated risk.
                </p>
              </>
            }
            infographic={
              <div className="p-5 bg-neutral-950 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    HYPOTHETICAL RISK / REWARD COMPARISON
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 italic">
                    *Illustrative educational benchmark
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-cyan-800/60 bg-black/70 flex flex-col gap-2">
                    <span className="text-xs font-mono text-cyan-400 font-bold">PROJECT A: MODULAR PROCESS OPTIMIZATION</span>
                    <span className="text-sm font-sans text-white font-semibold">Lower Potential Payoff • High Predictability</span>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                      <span>Success Probability: <strong className="text-emerald-400">85%</strong></span>
                      <span>Expected Return: <strong className="text-white">+12% Gain</strong></span>
                    </div>
                    <p className="text-xs text-slate-400 m-0">Low probability of sunk capital loss. Protects liquid balance sheet.</p>
                  </div>

                  <div className="p-4 border border-amber-800/60 bg-black/70 flex flex-col gap-2">
                    <span className="text-xs font-mono text-amber-400 font-bold">PROJECT B: QUANTUM SYNTHESIS MOONSHOT</span>
                    <span className="text-sm font-sans text-white font-semibold">High Potential Payoff • Extreme Uncertainty</span>
                    <div className="flex items-center justify-between text-xs font-mono text-slate-300 pt-1">
                      <span>Success Probability: <strong className="text-red-400">20%</strong></span>
                      <span>Expected Return: <strong className="text-amber-400">+150% Gain</strong></span>
                    </div>
                    <p className="text-xs text-slate-400 m-0">80% chance of complete sunk cost. Could jeopardize company solvency if concentrated.</p>
                  </div>
                </div>
              </div>
            }
            questions={[
              {
                question:
                  "A project offers a potential 50% return but has a high probability of failure. Should the company evaluate both outcomes before investing?",
                correctAnswer: true,
                explanation:
                  "The size of the possible payoff alone does not determine whether the investment is sensible.",
              },
              {
                question:
                  "A project is expensive and innovative. Does that alone prove it will outperform safer alternatives?",
                correctAnswer: false,
                explanation:
                  "Innovation and cost do not guarantee commercial success.",
              },
            ]}
            completedBadge="RISK ANALYSIS // REVIEWED"
            continueButtonLabel="CONTINUE TO OPPORTUNITY COST"
            onContinue={handleRiskRewardComplete}
          />
        )}

        {/* ====================================================================
            PAGE 4: CONCEPT 03 — OPPORTUNITY COST
           ==================================================================== */}
        {stage === "concept_opportunity_cost" && (
          <RdConceptModule
            principleNumber="03"
            title="OPPORTUNITY COST"
            subtitle="TRADE-OFFS, CAPITAL CONSTRAINTS & STRATEGIC PRIORITIZATION"
            conceptSummary={
              <>
                <p className="m-0 text-white font-medium">
                  <strong>Opportunity cost</strong> is the value of the best alternative the company gives up when it commits resources to a particular choice.
                </p>
                <p className="m-0 text-slate-300">
                  Cash allocated to R&amp;D cannot simultaneously fund marketing campaigns, operational improvements, debt repayment, or liquidity reserves. A company may be able to afford a project without that project being the best use of its available resources.
                </p>
              </>
            }
            infographic={
              <div className="p-5 bg-neutral-950 border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                    COMPETING USES OF THE SAME ₹10 LAKH BUDGET (ILLUSTRATIVE)
                  </span>
                  <span className="text-[11px] font-mono text-slate-400 italic">
                    *Illustrative trade-off models
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="p-3.5 border border-cyan-800/60 bg-black/60 flex flex-col gap-1">
                    <span className="text-xs font-mono text-cyan-400 font-bold">CHOICE A: R&amp;D COMMITMENT</span>
                    <strong className="text-sm font-sans text-white">Technological Moat</strong>
                    <p className="text-xs text-slate-300 m-0">Builds future capability but gives up immediate customer acquisition and cash cushion.</p>
                  </div>

                  <div className="p-3.5 border border-red-800/60 bg-black/60 flex flex-col gap-1">
                    <span className="text-xs font-mono text-red-400 font-bold">CHOICE B: MARKETING BLITZ</span>
                    <strong className="text-sm font-sans text-white">Immediate Market Share</strong>
                    <p className="text-xs text-slate-300 m-0">Drives rapid client growth today but surrenders technological modernization.</p>
                  </div>

                  <div className="p-3.5 border border-amber-800/60 bg-black/60 flex flex-col gap-1">
                    <span className="text-xs font-mono text-amber-400 font-bold">CHOICE C: TREASURY RESERVE</span>
                    <strong className="text-sm font-sans text-white">Solvency Cushion</strong>
                    <p className="text-xs text-slate-300 m-0">Shields against macro interest rate shocks but delays competitive development.</p>
                  </div>
                </div>
              </div>
            }
            questions={[
              {
                question:
                  "Investing ₹10 lakh in research means that the same money cannot simultaneously fund a marketing campaign. Is that an opportunity cost?",
                correctAnswer: true,
                explanation:
                  "Choosing one use of the money means giving up another possible use.",
              },
              {
                question:
                  "If the company has enough cash to fund a research project, does that automatically make it the best use of its money?",
                correctAnswer: false,
                explanation:
                  "Affordability does not establish strategic value. The company must consider alternatives and constraints.",
              },
            ]}
            completedBadge="ALL THREE RESEARCH PRINCIPLES REVIEWED"
            continueButtonLabel="PROCEED TO Q1 KNOWLEDGE CHECK"
            onContinue={handleOpportunityCostComplete}
            recapSection={
              <div className="p-5 border border-cyan-500/50 bg-black/90 flex flex-col gap-3 mt-2">
                <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  PROJECT GENESIS // FOUNDATIONAL RECAP:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono text-slate-300">
                  <div className="p-2.5 bg-neutral-900 border border-slate-800">
                    <strong className="block text-white mb-0.5">1. Horizon:</strong>
                    Delayed rewards require short-term solvency stamina.
                  </div>
                  <div className="p-2.5 bg-neutral-900 border border-slate-800">
                    <strong className="block text-white mb-0.5">2. Risk/Reward:</strong>
                    High payoff does not compensate for catastrophic insolvency risk.
                  </div>
                  <div className="p-2.5 bg-neutral-900 border border-slate-800">
                    <strong className="block text-white mb-0.5">3. Opportunity Cost:</strong>
                    Every committed rupee foregoes other vital strategic defenses.
                  </div>
                </div>
              </div>
            }
          />
        )}

        {/* ====================================================================
            PAGE 5: R&D KNOWLEDGE CHECK (ASSESSMENT GATE)
           ==================================================================== */}
        {stage === "knowledge_check" && (
          <RdKnowledgeCheck
            onPass={handleAssessmentPassed}
            onReviewConcepts={handleReviewConcepts}
          />
        )}

        {/* ====================================================================
            PAGE 6: Q1 EXECUTIVE DECISION: PROJECT HELIX
           ==================================================================== */}
        {stage === "project_helix_decision" && (
          <>
            {isProposalLoading || !proposalData ? (
              <div className="flex h-96 items-center justify-center font-mono text-slate-400">
                DECRYPTING CONFIDENTIAL RESEARCH PROPOSAL...
              </div>
            ) : (
              <ProjectHelixDecisionStage
                proposalData={proposalData}
                quarter={quarter}
                companyId={companyId!}
                onDecisionExecuted={handleDecisionExecuted}
                isAlreadyCommitted={isRdLocked}
              />
            )}
          </>
        )}

        {/* ====================================================================
            PAGE 7: CONSEQUENCE REPORT
           ==================================================================== */}
        {stage === "consequence_report" && decisionResult && (
          <RdConsequenceReport
            result={decisionResult}
            quarter={quarter}
            onReturnToHQ={handleBackToHQ}
          />
        )}

        {/* ====================================================================
            PAGE 7 READ-ONLY ARCHIVE (WHEN REVISITED IN LOCKED STATE)
           ==================================================================== */}
        {stage === "rd_locked_archive" && (
          <div className="flex flex-col gap-6 w-full py-2">
            <div className="rd-content-cluster !m-0 !max-w-none w-full">
              <div className="rd-cluster-header">
                <div className="market-cluster-header-left">
                  <div className="rd-cluster-accent-bar" />
                  <div>
                    <h2 className="market-cluster-title">
                      RESEARCH &amp; DEVELOPMENT // Q0{quarter} RATIFIED ARCHIVE
                    </h2>
                    <span className="market-cluster-subline">
                      PROJECT GENESIS DIRECTIVE LOCKED FOR CURRENT QUARTER
                    </span>
                  </div>
                </div>
                <span className="px-3.5 py-1.5 font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40">
                  SECTOR LOCKED
                </span>
              </div>

              <div className="market-cluster-body">
                <div className="p-6 bg-black/80 border border-slate-800 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>QUARTER 0{quarter} RESEARCH DIRECTIVE RATIFIED</span>
                  </div>
                  <h3 className="text-xl font-bold font-sans text-white m-0">
                    {deptLocks?.rd?.summary ?? "Project Genesis Directive Recorded"}
                  </h3>
                  <p className="text-sm font-sans text-slate-300 leading-relaxed m-0">
                    Executive directive has been committed to corporate history and woven into The
                    Corporate Times wire. Research assets are locked until the end-of-quarter board
                    meeting and subsequent quarter transition.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-800 flex justify-end">
                  <button
                    type="button"
                    onClick={handleBackToHQ}
                    className="game-button gold px-10 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
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
