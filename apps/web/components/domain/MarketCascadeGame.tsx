"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "@/lib/api-config";
import {
  MarketCascadeScenario,
  ScenarioCard,
  CascadeEvaluationResult,
} from "@/lib/hooks/use-market";

import { soundManager } from "@/lib/audio";

interface DisplayItem {
  card: ScenarioCard;
  statementNum: number; // Initially 1, 2, 3, 4, 5 in Slot 1, 2, 3, 4, 5
}

interface MarketCascadeGameProps {
  scenario: MarketCascadeScenario;
  onEvaluationComplete: (result: CascadeEvaluationResult) => void;
  onContinue: () => void;
  scenarioIndex: number;
  totalScenarios: number;
}

export function MarketCascadeGame({
  scenario,
  onEvaluationComplete,
  onContinue,
  scenarioIndex,
  totalScenarios,
}: MarketCascadeGameProps) {
  // Initially, Slot 1 has Statement 1, Slot 2 has Statement 2, ..., Slot 5 has Statement 5
  // The number stays tied to the statement when dragged!
  const [orderedItems, setOrderedItems] = useState<DisplayItem[]>(() => {
    return scenario.cards.map((c, i) => ({
      card: c,
      statementNum: i + 1,
    }));
  });

  // Re-sync on scenario change
  useEffect(() => {
    setOrderedItems(
      scenario.cards.map((c, i) => ({
        card: c,
        statementNum: i + 1,
      }))
    );
    setEvaluation(null);
  }, [scenario]);

  const [evaluation, setEvaluation] = useState<CascadeEvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Drag and drop handlers
  const handleDragStart = (idx: number) => {
    setDraggedIdx(idx);
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragOverIdx !== idx) {
      setDragOverIdx(idx);
    }
  };

  const handleDragLeave = () => {
    setDragOverIdx(null);
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (draggedIdx === null || draggedIdx === targetIdx) return;

    const next = [...orderedItems];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(targetIdx, 0, moved);
    setOrderedItems(next);
    setDraggedIdx(null);
    soundManager.playHover();
  };

  // Submit sequence to deterministic grading endpoint
  const handleLockPrediction = async () => {
    if (evaluating || evaluation) return;
    setEvaluating(true);
    soundManager.playClick();

    try {
      const res = await fetch(`${API_BASE}/api/v1/market/training/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scenario_id: scenario.id,
          submitted_order: orderedItems.map((item) => item.card.id),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Evaluation failed");
      }
      const data: CascadeEvaluationResult = await res.json();
      setEvaluation(data);
      onEvaluationComplete(data);
      if (data.passed) {
        soundManager.playSuccess();
      } else {
        soundManager.playAlert();
      }
    } catch (err) {
      console.error("[MarketCascade] Prediction evaluation error:", err);
      soundManager.playAlert();
    } finally {
      setEvaluating(false);
    }


  };

  return (
    <div className="market-content-cluster max-w-4xl mx-auto my-4 shadow-2xl">
      {/* Cluster Header */}
      <div className="market-cluster-header">
        <div className="market-cluster-header-left">
          <div className="market-cluster-accent-bar" />
          <div>
            <h2 className="market-cluster-title">
              {scenario.shock_name}
            </h2>
            <span className="market-cluster-subline">
              MODULE // {scenario.code} • {scenario.title.toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1.5 font-mono text-xs font-bold text-red-400 bg-red-950/60 border border-red-500/40">
            {scenario.shock_value}
          </span>
          <span className="font-mono text-xs text-slate-300 border border-slate-700/60 px-3 py-1.5 bg-neutral-900">
            PROTOCOL {scenarioIndex + 1} / {totalScenarios}
          </span>
        </div>
      </div>

      <div className="market-cluster-body">
        {/* Shock Description Callout */}
        <div className="p-5 bg-black/70 border border-slate-800 text-slate-200 text-sm font-mono leading-relaxed">
          <p className="m-0 text-white font-sans text-base leading-relaxed">
            {scenario.shock_description}
          </p>
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs tracking-wider text-slate-400">
            <span>DRAG STATEMENTS TO ARRANGE THEM FROM ROOT SHOCK (SLOT 1) TO SYSTEMIC CONSEQUENCE (SLOT 5).</span>
            <span className="text-amber-400 font-bold">STATEMENT NUMBERS STAY TIED TO CARDS</span>
          </div>
        </div>

        {/* Interactive Ranking Cards */}
        <div className="flex flex-col gap-3">
          {orderedItems.map((item, slotIdx) => {
            const positionCheck = evaluation?.position_results.find(
              (p) => p.card_id === item.card.id
            );
            const isDragOver = dragOverIdx === slotIdx;
            const isDragging = draggedIdx === slotIdx;

            return (
              <div
                key={item.card.id}
                draggable={!evaluation}
                onDragStart={() => handleDragStart(slotIdx)}
                onDragOver={(e) => handleDragOver(e, slotIdx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, slotIdx)}
                className={`flex items-center gap-5 p-4 border transition-all duration-150 select-none relative ${
                  isDragging ? "opacity-30 scale-95" : ""
                } ${
                  isDragOver ? "border-amber-400 bg-amber-500/15 scale-[1.01]" : ""
                } ${
                  evaluation
                    ? positionCheck?.status === "correct"
                      ? "border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                      : positionCheck?.status === "near"
                      ? "border-amber-500/60 bg-amber-950/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "border-red-500/60 bg-red-950/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                    : "border-slate-800/90 bg-neutral-950/80 hover:border-red-500/40 hover:bg-neutral-900/90 cursor-grab active:cursor-grabbing"
                }`}
              >
                {/* Slot Indicator badge */}
                <div className="text-xs font-mono font-bold text-slate-400 tracking-wider shrink-0 w-20 text-left">
                  SLOT 0{slotIdx + 1}
                </div>

                {/* STATEMENT NUMBER TIED TO CONTENT */}
                <div
                  className={`flex items-center justify-center w-11 h-11 font-mono font-black text-base border shrink-0 ${
                    evaluation
                      ? positionCheck?.status === "correct"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                        : positionCheck?.status === "near"
                        ? "bg-amber-500/20 border-amber-500 text-amber-300"
                        : "bg-red-500/20 border-red-500 text-red-300"
                      : "bg-black border-red-500/60 text-red-400"
                  }`}
                >
                  {item.statementNum}
                </div>

                {/* Statement Content */}
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase font-semibold">
                    STATEMENT #{item.statementNum}
                  </span>
                  <span className="text-slate-100 font-sans text-sm leading-relaxed">
                    {item.card.text}
                  </span>
                </div>

                {/* Evaluation feedback on position */}
                {evaluation && positionCheck && (
                  <div className="flex items-center gap-2 px-3 py-1 font-mono text-xs font-bold shrink-0">
                    {positionCheck.status === "correct" && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <span>✓</span> CORRECT
                      </span>
                    )}
                    {positionCheck.status === "near" && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <span>⚠</span> PARTIAL
                      </span>
                    )}
                    {positionCheck.status === "incorrect" && (
                      <span className="text-red-400 flex items-center gap-1">
                        <span>✕</span> SLOT 0{positionCheck.ideal_position}
                      </span>
                    )}
                  </div>
                )}

                {/* Drag indicator */}
                {!evaluation && (
                  <div className="text-slate-400 hover:text-slate-200 font-mono text-xs px-2 shrink-0 cursor-grab" title="Drag to reorder">
                    ⠿ DRAG
                  </div>
                )}
              </div>
            );
          })}
        </div>


        {/* Evaluation Results Drawer */}
        {evaluation ? (
          <div className="border border-slate-800 bg-black/90 p-5 flex flex-col gap-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex flex-col">
                <span className="text-[10px] font-mono tracking-widest text-slate-400 uppercase">
                  CASCADE TELEMETRY RESOLVED
                </span>
                <span
                  className={`text-lg font-bold font-sans tracking-wide ${
                    evaluation.passed ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {evaluation.passed ? "CAUSAL ORDER VERIFIED" : "PARTIAL TRANSMISSION MATCH"}
                </span>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex flex-col items-end font-mono">
                  <span className="text-[10px] text-slate-400">SCORE</span>
                  <span className="text-2xl font-black text-amber-400 font-mono">
                    {evaluation.score}
                    <span className="text-xs text-slate-400"> / 100</span>
                  </span>
                </div>
                <div className="flex flex-col items-end font-mono text-[11px] text-slate-400">
                  <span>PAIRS: {evaluation.satisfied_pairs} / 10</span>
                  <span>SLOTS: {evaluation.exact_matches} / 5</span>
                </div>
              </div>
            </div>

            {/* Step-by-step causal explanation */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase">
                TRANSMISSION GRAPH EXPLANATION
              </span>
              <div className="flex flex-col gap-2 p-3 bg-neutral-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-300">
                {evaluation.correct_order.map((cardId, i) => (
                  <div key={cardId} className="flex items-start gap-3">
                    <span className="text-red-400 font-bold">SLOT 0{i + 1}:</span>
                    <span>{evaluation.explanations[cardId]}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onContinue}
                className="game-button gold px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
              >
                <span>{scenarioIndex < totalScenarios - 1 ? "NEXT CASCADE PROTOCOL →" : "COMPLETE CASCADE EVALUATION →"}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={evaluating}
              onClick={handleLockPrediction}
              className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest disabled:opacity-50 cursor-pointer"
            >
              <span>{evaluating ? "CHECKING TRANSMISSION..." : "LOCK CASCADE PREDICTION"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
