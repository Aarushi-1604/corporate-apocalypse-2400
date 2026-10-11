"use client";

import { useState } from "react";
import { HelixProposalResponse, ExecuteRdDecisionResult, useExecuteRdDecision } from "@/lib/hooks/use-rd";
import { soundManager } from "@/lib/audio";

interface ProjectHelixDecisionStageProps {
  proposalData: HelixProposalResponse;
  quarter: number;
  companyId: string;
  onDecisionExecuted: (result: ExecuteRdDecisionResult) => void;
  isAlreadyCommitted?: boolean;
}

export function ProjectHelixDecisionStage({
  proposalData,
  quarter,
  companyId,
  onDecisionExecuted,
  isAlreadyCommitted = false,
}: ProjectHelixDecisionStageProps) {
  const { project, company_cash, cost_cash, can_afford, remaining_if_invested } = proposalData;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const executeMutation = useExecuteRdDecision(companyId);

  const handleSelect = (id: string) => {
    if (isAlreadyCommitted) return;
    soundManager.playHover();
    setSelectedOptionId(id);
  };

  const handlePromptConfirm = () => {
    if (!selectedOptionId || isAlreadyCommitted) return;
    soundManager.playClick();
    setIsConfirmModalOpen(true);
  };

  const handleExecute = async () => {
    if (!selectedOptionId || isAlreadyCommitted || executeMutation.isPending) return;
    soundManager.playClick();

    try {
      const result = await executeMutation.mutateAsync({
        quarter,
        option_id: selectedOptionId,
      });
      soundManager.playSuccess();
      setIsConfirmModalOpen(false);
      onDecisionExecuted(result);
    } catch {
      soundManager.playAlert();
      setIsConfirmModalOpen(false);
    }
  };

  const chosenOption = project.options.find((o) => o.id === selectedOptionId);

  return (
    <div className="flex flex-col gap-6 w-full py-2">
      {/* Proposal Dossier Cluster */}
      <div className="rd-content-cluster !m-0 !max-w-none w-full">
        <div className="rd-cluster-header">
          <div className="market-cluster-header-left">
            <div className="rd-cluster-accent-bar" />
            <div>
              <h2 className="market-cluster-title">
                CTO // CONFIDENTIAL RESEARCH PROPOSAL
              </h2>
              <span className="market-cluster-subline">
                PROJECT HELIX • PROCESS INTELLIGENCE ARCHITECTURE • Q0{quarter} DIRECTIVE
              </span>
            </div>
          </div>
          <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1 font-bold">
            STAGE 06 // CAPITAL MANDATE
          </span>
        </div>

        <div className="market-cluster-body">
          {/* CTO Briefing statement */}
          <div className="p-5 bg-black/80 border border-slate-800 text-slate-200 text-sm md:text-base leading-relaxed font-sans flex flex-col gap-2">
            <span className="text-xs font-mono text-cyan-400 font-bold uppercase tracking-wider">
              DR. MARCUS VANCE // CHIEF TECHNOLOGY OFFICER:
            </span>
            <p className="m-0 leading-relaxed">
              “CEO, the R&amp;D team proposes an investment in <strong>Project Helix</strong>. The
              initiative could improve operational efficiency and innovation capacity over future quarters, but its commercial outcome is uncertain. Funding the project will reduce available liquidity and prevent that same cash from being used elsewhere. Declining preserves resources for other priorities but could mean foregoing a future technological advantage. I need your directive.”
            </p>
          </div>

          {/* Real Company Financial Feasibility Readout */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
              <span className="text-xs font-mono text-slate-400 tracking-wider">CURRENT CASH RESERVES</span>
              <strong className="text-2xl font-bold font-mono text-white">
                ₹{company_cash.toLocaleString()}
              </strong>
            </div>

            <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
              <span className="text-xs font-mono text-slate-400 tracking-wider">PROPOSED R&amp;D COST</span>
              <strong className="text-2xl font-bold font-mono text-cyan-400">
                ₹{cost_cash.toLocaleString()}
              </strong>
            </div>

            <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
              <span className="text-xs font-mono text-slate-400 tracking-wider">REMAINING CASH IF INVESTED</span>
              <strong
                className={`text-2xl font-bold font-mono ${
                  remaining_if_invested < 20000 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                ₹{remaining_if_invested.toLocaleString()}
              </strong>
            </div>

            <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
              <span className="text-xs font-mono text-slate-400 tracking-wider">LIQUIDITY STATUS</span>
              <span
                className={`text-xs font-mono font-bold mt-1.5 ${
                  can_afford ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {can_afford ? "● CAPITAL ADEQUATE" : "▲ INSUFFICIENT CASH RESERVES"}
              </span>
            </div>
          </div>

          {/* The Exactly Two Choices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            {project.options.map((option) => {
              const isSelected = selectedOptionId === option.id;
              const isOptionAffordable = option.cost_cash === 0 || can_afford;

              return (
                <div
                  key={option.id}
                  onClick={() => {
                    if (isOptionAffordable) handleSelect(option.id);
                  }}
                  className={`p-6 border flex flex-col justify-between transition-all ${
                    !isOptionAffordable
                      ? "opacity-40 border-red-950 bg-black/50 cursor-not-allowed"
                      : isSelected
                      ? "border-cyan-400 bg-cyan-950/25 shadow-[0_0_20px_rgba(0,240,255,0.25)] cursor-pointer"
                      : "border-slate-800/90 bg-neutral-950/80 hover:border-slate-700 hover:bg-neutral-900/90 cursor-pointer"
                  }`}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono tracking-widest text-cyan-400 font-bold uppercase">
                        EXECUTIVE DIRECTIVE
                      </span>
                      <span className="font-mono text-sm font-bold text-slate-200">
                        EXPENDITURE: {option.cost_cash > 0 ? `₹${option.cost_cash.toLocaleString()}` : "₹0 (PRESERVE)"}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold font-sans text-white tracking-wide m-0">
                      {option.title}
                    </h3>

                    <p className="text-sm md:text-base text-slate-300 leading-relaxed font-sans m-0">
                      {option.description}
                    </p>

                    <div className="mt-2.5 p-3.5 bg-black/70 border border-slate-800 text-xs md:text-sm font-mono flex flex-col gap-1">
                      <span className="text-amber-400 font-bold">KNOWN TRADEOFF &amp; RISK:</span>
                      <span className="text-slate-200">{option.tradeoff}</span>
                    </div>
                  </div>

                  {/* Immediate KPI Delas Preview */}
                  <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex flex-wrap gap-2 text-xs font-mono">
                    <span className="text-slate-400 font-bold self-center mr-1">
                      IMMEDIATE IMPACT:
                    </span>
                    {Object.entries(option.stat_deltas).map(([kpi, val]) => (
                      <span
                        key={kpi}
                        className={`px-3 py-1 font-bold ${
                          val > 0
                            ? "bg-emerald-950/60 text-emerald-300 border border-emerald-500/40"
                            : val < 0
                            ? "bg-red-950/60 text-red-300 border border-red-500/40"
                            : "bg-slate-900 text-slate-400 border border-slate-800"
                        }`}
                      >
                        {val > 0 ? `+${val}` : val} {kpi.toUpperCase()}
                      </span>
                    ))}
                    {option.cost_cash > 0 && (
                      <span className="px-3 py-1 font-bold bg-amber-950/60 text-amber-300 border border-amber-500/40">
                        -₹{option.cost_cash.toLocaleString()} CASH
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Directive Commit Action */}
          <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs font-mono text-slate-400 tracking-wide">
              {selectedOptionId
                ? `CONFIRMATION REQUIRED: SELECTED ${chosenOption?.action_label}. REQUIRES FORMAL RATIFICATION.`
                : "SELECT ONE OF THE TWO STRATEGIC DIRECTIVES TO PROCEED WITH RATIFICATION."}
            </span>

            <button
              type="button"
              disabled={!selectedOptionId || executeMutation.isPending}
              onClick={handlePromptConfirm}
              className={`game-button gold px-10 py-3 text-xs font-mono font-bold tracking-widest ${
                !selectedOptionId ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <span>CONFIRM &amp; EXECUTE DIRECTIVE →</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && chosenOption && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
          <div className="border border-cyan-500/60 bg-neutral-950 max-w-xl w-full p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse" />
              <h3 className="text-sm font-bold font-sans tracking-wide text-white uppercase m-0">
                CONFIRM FORMAL R&amp;D DIRECTIVE // Q0{quarter}
              </h3>
            </div>

            <div className="flex flex-col gap-3 text-sm font-mono text-slate-200">
              <p className="m-0 leading-relaxed">
                You are about to formally ratify the following executive mandate:
              </p>
              <div className="p-4 bg-black border border-cyan-900/50 flex flex-col gap-1.5">
                <span className="text-cyan-400 font-bold">{chosenOption.title}</span>
                <span className="text-xs text-slate-400">Expenditure: ₹{chosenOption.cost_cash.toLocaleString()}</span>
                <span className="text-xs text-slate-300 mt-1">{chosenOption.tradeoff}</span>
              </div>
              <p className="text-xs text-amber-400 m-0">
                ⚠ THIS DIRECTIVE LOCKS THE R&amp;D SECTOR FOR THE REMAINDER OF QUARTER 0{quarter}. THIS ACTION CANNOT BE REVERSED.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-6 py-2.5 border border-slate-700 bg-neutral-900 text-xs font-mono text-slate-300 font-bold tracking-widest cursor-pointer"
              >
                CANCEL
              </button>
              <button
                type="button"
                disabled={executeMutation.isPending}
                onClick={handleExecute}
                className="game-button gold px-8 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
              >
                <span>{executeMutation.isPending ? "COMMITTING DIRECTIVE..." : "AUTHORIZE MANDATE ✓"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
