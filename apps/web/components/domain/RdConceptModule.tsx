"use client";

import { soundManager } from "@/lib/audio";

interface ConceptPracticeQuestion {
  question: string;
  correctAnswer: boolean; // true = YES, false = NO
  explanation: string;
}

interface RdConceptModuleProps {
  principleNumber: string;
  title: string;
  subtitle: string;
  conceptSummary: React.ReactNode;
  infographic: React.ReactNode;
  questions: [ConceptPracticeQuestion, ConceptPracticeQuestion];
  completedBadge: string;
  continueButtonLabel: string;
  onContinue: () => void;
  recapSection?: React.ReactNode;
}

import { useState } from "react";

export function RdConceptModule({
  principleNumber,
  title,
  subtitle,
  conceptSummary,
  infographic,
  questions,
  completedBadge,
  continueButtonLabel,
  onContinue,
  recapSection,
}: RdConceptModuleProps) {
  // Current active question: 0 or 1
  const [currentQIndex, setCurrentQIndex] = useState<0 | 1>(0);
  const [userAnswers, setUserAnswers] = useState<Record<number, boolean | null>>({
    0: null,
    1: null,
  });
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<Record<number, boolean>>({
    0: false,
    1: false,
  });

  const activeQ = questions[currentQIndex];
  const isCurrentRevealed = isAnswerRevealed[currentQIndex];
  const currentUserAnswer = userAnswers[currentQIndex];
  const allAnswered = isAnswerRevealed[0] && isAnswerRevealed[1];

  const handleSelectAnswer = (answer: boolean) => {
    if (isCurrentRevealed) return;
    soundManager.playClick();
    setUserAnswers((prev) => ({ ...prev, [currentQIndex]: answer }));
    setIsAnswerRevealed((prev) => ({ ...prev, [currentQIndex]: true }));
    if (answer === activeQ.correctAnswer) {
      soundManager.playSuccess();
    } else {
      soundManager.playAlert();
    }
  };

  const handleNextQuestion = () => {
    soundManager.playClick();
    setCurrentQIndex(1);
  };

  return (
    <div className="flex flex-col gap-6 w-full py-2">
      {/* Concept Theory Card */}
      <div className="rd-content-cluster !m-0 !max-w-none w-full">
        <div className="rd-cluster-header">
          <div className="market-cluster-header-left">
            <div className="rd-cluster-accent-bar" />
            <div>
              <h2 className="market-cluster-title">
                RESEARCH PRINCIPLE {principleNumber} // {title}
              </h2>
              <span className="market-cluster-subline">
                PROJECT GENESIS • {subtitle}
              </span>
            </div>
          </div>
          <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1 font-bold">
            FOUNDATION MODULE {principleNumber} / 03
          </span>
        </div>

        <div className="market-cluster-body">
          {/* Main concept explanation */}
          <div className="p-5 bg-black/80 border border-slate-800 text-slate-200 text-sm md:text-base leading-relaxed font-sans flex flex-col gap-3">
            {conceptSummary}
          </div>

          {/* Interactive visual infographic / timeline comparison */}
          {infographic}

          {/* Instructional Practice Questions */}
          <div className="border border-cyan-900/60 bg-black/90 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                <h3 className="text-sm font-bold font-sans tracking-wider text-cyan-300 uppercase m-0">
                  PRACTICE QUESTION 0{currentQIndex + 1} OF 02
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400">
                INSTRUCTIONAL CHECK • NO CAPITAL RISK
              </span>
            </div>

            <div className="p-4 bg-neutral-950 border border-slate-800 flex flex-col gap-4">
              <p className="text-base text-white font-sans m-0 leading-relaxed font-medium">
                “{activeQ.question}”
              </p>

              {/* YES / NO selection buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => handleSelectAnswer(true)}
                  disabled={isCurrentRevealed}
                  className={`flex-1 py-3 px-6 font-mono text-sm font-bold tracking-widest border transition-all ${
                    isCurrentRevealed
                      ? activeQ.correctAnswer === true
                        ? "border-emerald-500 bg-emerald-950/80 text-emerald-300"
                        : currentUserAnswer === true
                        ? "border-red-500 bg-red-950/80 text-red-300"
                        : "border-slate-800 bg-black/50 text-slate-600 opacity-40"
                      : "border-slate-700 bg-black/70 hover:border-cyan-400 hover:bg-cyan-950/30 text-slate-200"
                  }`}
                >
                  YES
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectAnswer(false)}
                  disabled={isCurrentRevealed}
                  className={`flex-1 py-3 px-6 font-mono text-sm font-bold tracking-widest border transition-all ${
                    isCurrentRevealed
                      ? activeQ.correctAnswer === false
                        ? "border-emerald-500 bg-emerald-950/80 text-emerald-300"
                        : currentUserAnswer === false
                        ? "border-red-500 bg-red-950/80 text-red-300"
                        : "border-slate-800 bg-black/50 text-slate-600 opacity-40"
                      : "border-slate-700 bg-black/70 hover:border-cyan-400 hover:bg-cyan-950/30 text-slate-200"
                  }`}
                >
                  NO
                </button>
              </div>

              {/* Revealed Feedback & Explanation */}
              {isCurrentRevealed && (
                <div
                  className={`p-4 border text-sm font-mono leading-relaxed animate-in fade-in duration-150 ${
                    currentUserAnswer === activeQ.correctAnswer
                      ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                      : "bg-amber-950/40 border-amber-500/60 text-amber-200"
                  }`}
                >
                  <strong className="block mb-1 font-bold">
                    {currentUserAnswer === activeQ.correctAnswer
                      ? "✓ CORRECT VERDICT"
                      : "INCORRECT EVALUATION"}
                  </strong>
                  <span>{activeQ.explanation}</span>
                </div>
              )}

              {/* Progress to next practice question if on Q1 and revealed */}
              {isCurrentRevealed && currentQIndex === 0 && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="game-button gold px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>NEXT PRACTICE QUESTION →</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* All Questions Completed State */}
          {allAnswered && (
            <div className="p-4 bg-cyan-950/30 border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-3">
                <span className="text-cyan-400 font-mono text-sm font-bold">
                  ✓ {completedBadge}
                </span>
              </div>

              <button
                type="button"
                onClick={onContinue}
                className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
              >
                <span>{continueButtonLabel} →</span>
              </button>
            </div>
          )}

          {/* Optional final recap block (Page 4) */}
          {recapSection}
        </div>
      </div>
    </div>
  );
}
