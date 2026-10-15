"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronRight, ChevronLeft, X, Sparkles, Navigation } from "lucide-react";

export interface TutorialStep {
  id: number;
  text: string;
  targetSelector?: string;
  position?: "center" | "top" | "bottom" | "left" | "right";
  highlightLabel?: string;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    text: "Welcome to Corporate Apocalypse 2400. You are the CEO. Your goal is simple: survive four quarters and keep your company alive.",
    position: "center",
  },
  {
    id: 2,
    text: "This is the Headquarters.",
    targetSelector: ".city-hq",
    position: "bottom",
    highlightLabel: "EXECUTIVE HEADQUARTERS",
  },
  {
    id: 3,
    text: "Here, you'll make executive decisions across three divisions: Finance & Operations, Market & Acquisitions, and R&D.",
    targetSelector: ".city-hq",
    position: "bottom",
    highlightLabel: "DIVISION STRATEGY",
  },
  {
    id: 4,
    text: "Each decision affects your company's finances, reputation, operations, and future options.",
    targetSelector: ".city-hq",
    position: "bottom",
  },
  {
    id: 5,
    text: "Board Meetings are where your decisions are challenged and your next quarter is determined.",
    targetSelector: ".city-hq",
    position: "bottom",
    highlightLabel: "QUARTERLY BOARD REVIEW",
  },
  {
    id: 6,
    text: "The Board Meeting remains locked until you've completed the required activities for the quarter.",
    targetSelector: ".city-hq",
    position: "bottom",
  },
  {
    id: 7,
    text: "This is the Client World.",
    targetSelector: ".city-client",
    position: "top",
    highlightLabel: "CLIENT WORLD",
  },
  {
    id: 8,
    text: "Here, you negotiate with clients and try to win business.",
    targetSelector: ".city-client",
    position: "top",
    highlightLabel: "COMMERCIAL NEGOTIATIONS",
  },
  {
    id: 9,
    text: "Successfully finalized deals can increase liquid cash, but commitments and delivery obligations matter too.",
    targetSelector: ".city-client",
    position: "top",
  },
  {
    id: 10,
    text: "Pitch professionally, address the client's requirements, and include the important points in your proposal.",
    targetSelector: ".city-client",
    position: "top",
  },
  {
    id: 11,
    text: "This is the Press World.",
    targetSelector: ".city-press",
    position: "top",
    highlightLabel: "PRESS WORLD",
  },
  {
    id: 12,
    text: "Journalists will question your decisions, investigate inconsistencies, and challenge your public statements.",
    targetSelector: ".city-press",
    position: "top",
    highlightLabel: "MEDIA SCRUTINY",
  },
  {
    id: 13,
    text: "Your responses can affect reputation, investor confidence, and future scrutiny.",
    targetSelector: ".city-press",
    position: "top",
  },
  {
    id: 14,
    text: "Your EXEC-OS KPI Tablet is at the bottom-right. Use it to monitor your finances, KPIs, progress, and decision history.",
    targetSelector: ".holographic-tablet-launcher-container",
    position: "top",
    highlightLabel: "EXEC-OS KPI TABLET",
  },
  {
    id: 15,
    text: "Your ARIA AI Assistant is on the left. Ask it to explain unfamiliar business terms, clarify a question, or give you a hint.",
    targetSelector: ".aria-assistant-launcher-container",
    position: "right",
    highlightLabel: "ARIA AI ASSISTANT",
  },
  {
    id: 16,
    text: "ARIA is an advisor, not a decision-maker. You remain responsible for your choices.",
    targetSelector: ".aria-assistant-launcher-container",
    position: "right",
  },
  {
    id: 17,
    text: "The top navigation bar shows your available liquid cash and other key status information.",
    targetSelector: ".system-bar",
    position: "bottom",
    highlightLabel: "EXECUTIVE HUD // CAPITAL",
  },
  {
    id: 18,
    text: "Watch your cash carefully. An unaffordable decision can end your run.",
    targetSelector: ".system-stats",
    position: "bottom",
    highlightLabel: "LIQUID CASH BALANCE",
  },
  {
    id: 19,
    text: "Your mission: survive all four quarters, manage risk, fulfill commitments, and keep your company alive.",
    position: "center",
  },
  {
    id: 20,
    text: "Tutorial complete. You're in charge now. Good luck, CEO.",
    position: "center",
  },
];

interface WorldTourTutorialProps {
  companyId?: string;
  quarter?: number;
  onComplete?: () => void;
}

export function WorldTourTutorial({
  companyId,
  quarter = 1,
  onComplete,
}: WorldTourTutorialProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Check persistence
  useEffect(() => {
    if (!companyId) return;
    if (quarter > 1) {
      setIsActive(false);
      return;
    }
    const storageKey = `ca2400_tutorial_completed_${companyId}`;
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      setIsActive(true);
    }
  }, [companyId, quarter]);

  const step = TUTORIAL_STEPS[currentStepIndex];

  // Update target rect for spotlight
  const updateSpotlight = useCallback(() => {
    if (!step.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isActive) return;
    updateSpotlight();
    window.addEventListener("resize", updateSpotlight);
    return () => window.removeEventListener("resize", updateSpotlight);
  }, [isActive, currentStepIndex, updateSpotlight]);

  const handleFinish = () => {
    setIsActive(false);
    if (companyId) {
      localStorage.setItem(`ca2400_tutorial_completed_${companyId}`, "true");
    }
    onComplete?.();
  };

  const handleNext = () => {
    if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleFinish();
      } else if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, currentStepIndex]);

  if (!isActive) return null;

  const isFinalStep = currentStepIndex === TUTORIAL_STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-auto select-none transition-all duration-300 font-sans"
      aria-label="CEO Onboarding World Tour"
      role="dialog"
      aria-modal="true"
    >
      {/* Dark backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

      {/* Spotlight cutout if targetRect exists */}
      {targetRect && (
        <div
          className="absolute border-2 border-amber-400/90 rounded-md shadow-[0_0_30px_rgba(251,191,36,0.4)] pointer-events-none transition-all duration-300 animate-pulse"
          style={{
            top: `${Math.max(0, targetRect.top - 6)}px`,
            left: `${Math.max(0, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        >
          {step.highlightLabel && (
            <div className="absolute -top-7 left-0 px-2 py-0.5 bg-amber-500 text-black text-[10px] font-mono font-bold tracking-widest uppercase rounded shadow">
              {step.highlightLabel}
            </div>
          )}
        </div>
      )}

      {/* Dialogue Box */}
      <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none">
        <div className="relative max-w-xl w-full pointer-events-auto bg-[#0a0d14]/95 border-2 border-amber-500/70 shadow-[0_0_50px_rgba(251,191,36,0.25)] rounded-lg p-6 backdrop-blur-md text-slate-100 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs tracking-widest font-semibold uppercase">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <span>EXEC-OS // EXECUTIVE INDUCTION TOUR</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-amber-500/70 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
                STEP {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
              </span>
              <button
                onClick={handleFinish}
                className="text-slate-400 hover:text-amber-400 text-xs font-mono uppercase tracking-wider flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-white/5"
                title="Skip the tutorial (Esc)"
              >
                <span>SKIP</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Dialogue Content */}
          <div className="py-2 min-h-[70px] flex items-center">
            <p className="text-base md:text-lg leading-relaxed text-slate-100 font-medium">
              {step.text}
            </p>
          </div>

          {/* Progress dots & Navigation buttons */}
          <div className="flex items-center justify-between border-t border-amber-500/20 pt-4 mt-2">
            {/* Dots */}
            <div className="flex items-center gap-1 max-w-[200px] overflow-hidden">
              {TUTORIAL_STEPS.map((s, idx) => (
                <div
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentStepIndex
                      ? "w-5 bg-amber-400"
                      : idx < currentStepIndex
                      ? "w-2 bg-amber-600/50"
                      : "w-1.5 bg-slate-700/50"
                  }`}
                />
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 font-mono text-xs tracking-wider flex items-center gap-1 transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>PREV</span>
                </button>
              )}
              <button
                onClick={handleNext}
                className="px-5 py-2 rounded bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono text-xs font-bold tracking-widest flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(251,191,36,0.3)] active:scale-95"
              >
                <span>{isFinalStep ? "COMMENCE CEO RUN" : "NEXT"}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Keyboard tip */}
          <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
            <span>[ENTER] / [→] NEXT</span>
            <span>[ESC] SKIP TOUR</span>
          </div>
        </div>
      </div>
    </div>
  );
}
