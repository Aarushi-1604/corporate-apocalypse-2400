"use client";

import { useEffect, useState } from "react";
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
      const res = await fetch("http://localhost:8000/api/v1/market/training/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          scenario_id: scenario.id,
          submitted_order: orderedItems.map((item) => item.card.id),
        }),
      });
      if (!res.ok) throw new Error("Evaluation failed");
      const data: CascadeEvaluationResult = await res.json();
      setEvaluation(data);
      onEvaluationComplete(data);
      if (data.passed) {
        soundManager.playSuccess();
      } else {
        soundManager.playAlert();
      }
    } catch {
      // Offline fallback
    } finally {
      setEvaluating(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto py-4">
      {/* Scenario Brief Header */}
      <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-amber-500/10 border-b border-l border-amber-500/30 font-mono text-xs text-amber-400">
          CASCADE PROTOCOL ({scenarioIndex + 1}/{totalScenarios})
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-500/70 mb-2">
          <span>MODULE // {scenario.code}</span>
          <span>•</span>
          <span>{scenario.title}</span>
        </div>

        <div className="flex flex-wrap items-baseline gap-4 mb-3">
          <h2 className="text-2xl font-black tracking-wider text-white">
            {scenario.shock_name}
          </h2>
          <span className="px-3 py-1 rounded bg-red-500/20 border border-red-500/50 font-mono font-bold text-red-400 text-sm animate-pulse">
            {scenario.shock_value}
          </span>
        </div>

        <p className="text-neutral-300 text-sm max-w-3xl leading-relaxed">
          {scenario.shock_description}
        </p>

        <div className="mt-4 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-xs font-mono text-neutral-400">
          <span>DRAG STATEMENTS TO ARRANGE THEM FROM FIRST THING THAT HAPPENS (SLOT 1) TO THE FINAL RESULT (SLOT 5).</span>
          <span className="text-amber-400/80">STATEMENT NUMBERS STAY TIED TO THEIR CARDS</span>
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
              className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 select-none relative ${
                isDragging ? "opacity-30 scale-95" : ""
              } ${
                isDragOver ? "border-amber-400 bg-amber-500/20 scale-[1.01]" : ""
              } ${
                evaluation
                  ? positionCheck?.status === "correct"
                    ? "border-emerald-500/50 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
                    : positionCheck?.status === "near"
                    ? "border-amber-500/50 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]"
                    : "border-red-500/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                  : "border-neutral-800 bg-neutral-900/60 hover:border-amber-500/40 hover:bg-neutral-900/90 cursor-grab active:cursor-grabbing"
              }`}
            >
              {/* Slot Indicator badge */}
              <div className="text-[11px] font-mono text-neutral-500 tracking-wider shrink-0 w-14 text-left">
                SLOT {slotIdx + 1}
              </div>

              {/* STATEMENT NUMBER TIED TO CONTENT (e.g. Statement 1 stays [ 1 ] wherever dragged) */}
              <div
                className={`flex items-center justify-center w-10 h-10 rounded font-mono font-black text-base border shrink-0 ${
                  evaluation
                    ? positionCheck?.status === "correct"
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                      : positionCheck?.status === "near"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-red-500/20 border-red-500 text-red-400"
                    : "bg-neutral-950 border-amber-500/40 text-amber-400"
                }`}
              >
                {item.statementNum}
              </div>

              {/* Statement Content */}
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-[10px] font-mono tracking-widest text-amber-500/60 uppercase">
                  STATEMENT #{item.statementNum}
                </span>
                <span className="text-neutral-200 font-medium text-sm leading-snug">
                  {item.card.text}
                </span>
              </div>

              {/* Evaluation feedback on position */}
              {evaluation && positionCheck && (
                <div className="flex items-center gap-2 px-3 py-1 rounded font-mono text-xs font-bold shrink-0">
                  {positionCheck.status === "correct" && (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <span>✓</span> POSITION CORRECT
                    </span>
                  )}
                  {positionCheck.status === "near" && (
                    <span className="text-amber-400 flex items-center gap-1">
                      <span>⚠</span> CLOSE (PARTIAL CREDIT)
                    </span>
                  )}
                  {positionCheck.status === "incorrect" && (
                    <span className="text-red-400 flex items-center gap-1">
                      <span>✕</span> MISPLACED (GOES IN SLOT #{positionCheck.ideal_position})
                    </span>
                  )}
                </div>
              )}

              {/* Drag indicator */}
              {!evaluation && (
                <div className="text-neutral-500 hover:text-neutral-300 font-mono text-xs px-2 shrink-0 cursor-grab" title="Drag to reorder">
                  ⠿ DRAG
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Evaluation Results Drawer */}
      {evaluation ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-800">
            <div className="flex flex-col">
              <span className="text-xs font-mono tracking-widest text-neutral-400">
                MARKET CASCADE RESOLVED
              </span>
              <span
                className={`text-2xl font-black tracking-wide ${
                  evaluation.passed ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {evaluation.passed ? "CHAIN ORDER VERIFIED" : "CLOSE TRY -- PARTIAL CREDIT"}
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex flex-col items-end font-mono">
                <span className="text-xs text-neutral-400">SCORE</span>
                <span className="text-3xl font-black text-amber-400">
                  {evaluation.score}
                  <span className="text-sm text-neutral-500"> / 100</span>
                </span>
              </div>
              <div className="flex flex-col items-end font-mono text-xs text-neutral-400">
                <span>PAIRS SATISFIED: {evaluation.satisfied_pairs} / 10</span>
                <span>EXACT SLOTS: {evaluation.exact_matches} / 5</span>
              </div>
            </div>
          </div>

          {/* Simple step-by-step causal explanation */}
          <div className="flex flex-col gap-2">
            <span className="text-xs font-mono tracking-widest text-amber-500/80 uppercase">
              WHY THIS HAPPENS // CAUSAL CHAIN
            </span>
            <div className="flex flex-col gap-2 p-4 rounded bg-neutral-900/60 border border-neutral-800 text-xs font-mono text-neutral-300">
              {evaluation.correct_order.map((cardId, i) => (
                <div key={cardId} className="flex items-start gap-3">
                  <span className="text-amber-400 font-bold">SLOT {i + 1}:</span>
                  <span>{evaluation.explanations[cardId]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onContinue}
              className="px-6 py-3 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer"
            >
              <span>CONTINUE TO MARKET INTELLIGENCE</span>
              <span>→</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            disabled={evaluating}
            onClick={handleLockPrediction}
            className="px-8 py-3.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-black font-mono tracking-widest flex items-center gap-3 shadow-[0_0_25px_rgba(245,158,11,0.3)] disabled:opacity-50 cursor-pointer"
          >
            {evaluating ? "CHECKING SEQUENCE..." : "LOCK PREDICTION & TRACE SHOCK"}
          </button>
        </div>
      )}
    </div>
  );
}
