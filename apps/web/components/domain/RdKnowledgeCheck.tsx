"use client";

import { useState } from "react";
import { soundManager } from "@/lib/audio";

interface KnowledgeQuestion {
  id: number;
  concept: string;
  question: string;
  correctAnswer: boolean;
  explanation: string;
}

const KNOWLEDGE_QUESTIONS: KnowledgeQuestion[] = [
  {
    id: 1,
    concept: "INVESTMENT HORIZON",
    question:
      "A deep-tech innovation project yields zero revenue in Q1 but creates proprietary infrastructure that compounds enterprise efficiency in Q3 and Q4. Can an R&D project with delayed payoffs be strategically sound?",
    correctAnswer: true,
    explanation:
      "Yes. Investment horizon recognizes that strategic technological moats and operational productivity often take several quarters to manifest, rather than delivering immediate quarterly revenue.",
  },
  {
    id: 2,
    concept: "RISK VS REWARD",
    question:
      "A frontier research proposal claims a potential 10x ROI but has an 80% failure probability and will consume 70% of company reserves. Should a high potential return justify risking corporate insolvency?",
    correctAnswer: false,
    explanation:
      "No. Risk and reward must be balanced against corporate survivability. Sunk research costs in unviable ventures can trigger catastrophic liquidity insolvency regardless of theoretical payoffs.",
  },
  {
    id: 3,
    concept: "OPPORTUNITY COST",
    question:
      "If a company holds ₹1,00,000 in cash and can comfortably fund a ₹25,000 R&D initiative, does having sufficient capital eliminate the opportunity cost of that expenditure?",
    correctAnswer: false,
    explanation:
      "No. Affordability does not eliminate opportunity cost. Every rupee committed to R&D is capital that cannot simultaneously defend market share, service debt, or buffer against macroeconomic shocks.",
  },
  {
    id: 4,
    concept: "SYSTEMIC INNOVATION ECONOMICS",
    question:
      "Are commercial market viability, research execution risk, and competitive alternatives just as critical to evaluate as the raw scientific merit of a technology?",
    correctAnswer: true,
    explanation:
      "Yes. Scientific sophistication alone does not guarantee commercial value. A CEO must weigh market adoption, unit economics, risk tolerance, and strategic alignment before committing corporate assets.",
  },
];

interface RdKnowledgeCheckProps {
  onPass: (score: number) => void;
  onReviewConcepts: () => void;
}

export function RdKnowledgeCheck({ onPass, onReviewConcepts }: RdKnowledgeCheckProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, boolean | null>>({});
  const [submitted, setSubmitted] = useState<Record<number, boolean>>({});
  const [isFinished, setIsFinished] = useState(false);

  const activeQ = KNOWLEDGE_QUESTIONS[currentIdx];
  const isCurrentSubmitted = submitted[currentIdx];
  const currentAnswer = answers[currentIdx];

  // Submit current answer
  const handleSelectAnswer = (ans: boolean) => {
    if (isCurrentSubmitted) return;
    soundManager.playClick();
    setAnswers((prev) => ({ ...prev, [currentIdx]: ans }));
    setSubmitted((prev) => ({ ...prev, [currentIdx]: true }));

    if (ans === activeQ.correctAnswer) {
      soundManager.playSuccess();
    } else {
      soundManager.playAlert();
    }
  };

  const handleNext = () => {
    soundManager.playClick();
    if (currentIdx < KNOWLEDGE_QUESTIONS.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      setIsFinished(true);
      // Compute score
      let correct = 0;
      KNOWLEDGE_QUESTIONS.forEach((q, i) => {
        if (answers[i] === q.correctAnswer) correct += 1;
      });
      const pct = Math.round((correct / KNOWLEDGE_QUESTIONS.length) * 100);
      if (pct >= 75) {
        soundManager.playSuccess();
        onPass(pct);
      } else {
        soundManager.playAlert();
      }
    }
  };

  const handleRetry = () => {
    soundManager.playAlert();
    setCurrentIdx(0);
    setAnswers({});
    setSubmitted({});
    setIsFinished(false);
  };

  // Score calculation
  let correctCount = 0;
  KNOWLEDGE_QUESTIONS.forEach((q, i) => {
    if (answers[i] === q.correctAnswer) correctCount += 1;
  });
  const finalPercentage = Math.round((correctCount / KNOWLEDGE_QUESTIONS.length) * 100);
  const isPassed = finalPercentage >= 75;

  return (
    <div className="flex flex-col gap-6 w-full py-2">
      <div className="rd-content-cluster !m-0 !max-w-none w-full">
        <div className="rd-cluster-header">
          <div className="market-cluster-header-left">
            <div className="rd-cluster-accent-bar" />
            <div>
              <h2 className="market-cluster-title">
                PROJECT GENESIS // KNOWLEDGE VERIFICATION
              </h2>
              <span className="market-cluster-subline">
                EXECUTIVE R&amp;D ECONOMIC RIGOR ASSESSMENT
              </span>
            </div>
          </div>
          <span className="font-mono text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-3 py-1 font-bold">
            STAGE 05 // ASSESSMENT GATE (75%+ PASS)
          </span>
        </div>

        <div className="market-cluster-body">
          {!isFinished ? (
            <div className="flex flex-col gap-5">
              {/* Progress counter */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-mono text-xs text-cyan-300 font-bold">
                  VERIFICATION PROMPT 0{currentIdx + 1} OF 0{KNOWLEDGE_QUESTIONS.length}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  CATEGORY: {activeQ.concept}
                </span>
              </div>

              {/* Question Statement */}
              <div className="p-5 bg-neutral-950 border border-slate-800 flex flex-col gap-4">
                <p className="text-base text-white font-sans m-0 leading-relaxed font-semibold">
                  “{activeQ.question}”
                </p>

                {/* YES / NO Choices */}
                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectAnswer(true)}
                    disabled={isCurrentSubmitted}
                    className={`flex-1 py-3.5 px-6 font-mono text-sm font-bold tracking-widest border transition-all ${
                      isCurrentSubmitted
                        ? activeQ.correctAnswer === true
                          ? "border-emerald-500 bg-emerald-950/80 text-emerald-300"
                          : currentAnswer === true
                          ? "border-red-500 bg-red-950/80 text-red-300"
                          : "border-slate-800 bg-black/50 text-slate-600 opacity-40"
                        : "border-slate-700 bg-black/70 hover:border-cyan-400 hover:bg-cyan-950/30 text-slate-200 cursor-pointer"
                    }`}
                  >
                    YES
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectAnswer(false)}
                    disabled={isCurrentSubmitted}
                    className={`flex-1 py-3.5 px-6 font-mono text-sm font-bold tracking-widest border transition-all ${
                      isCurrentSubmitted
                        ? activeQ.correctAnswer === false
                          ? "border-emerald-500 bg-emerald-950/80 text-emerald-300"
                          : currentAnswer === false
                          ? "border-red-500 bg-red-950/80 text-red-300"
                          : "border-slate-800 bg-black/50 text-slate-600 opacity-40"
                        : "border-slate-700 bg-black/70 hover:border-cyan-400 hover:bg-cyan-950/30 text-slate-200 cursor-pointer"
                    }`}
                  >
                    NO
                  </button>
                </div>

                {/* Explanation upon submission */}
                {isCurrentSubmitted && (
                  <div
                    className={`p-4 border text-sm font-mono leading-relaxed mt-2 animate-in fade-in duration-150 ${
                      currentAnswer === activeQ.correctAnswer
                        ? "bg-emerald-950/40 border-emerald-500/60 text-emerald-200"
                        : "bg-red-950/40 border-red-500/60 text-red-200"
                    }`}
                  >
                    <strong className="block mb-1 font-bold">
                      {currentAnswer === activeQ.correctAnswer
                        ? "✓ SUBMISSION CONFIRMED: ACCURATE EVALUATION"
                        : "⚠ SUBMISSION CONFIRMED: MISJUDGED PRINCIPLE"}
                    </strong>
                    <span>{activeQ.explanation}</span>
                  </div>
                )}

                {/* Next Prompt button */}
                {isCurrentSubmitted && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
                    >
                      <span>
                        {currentIdx < KNOWLEDGE_QUESTIONS.length - 1
                          ? "NEXT PROMPT →"
                          : "CALCULATE ASSESSMENT VERDICT →"}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Final Assessment Verdict */
            <div className="flex flex-col gap-6 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-black/80 border border-slate-800 gap-4">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    ASSESSMENT TRANSMISSION SCORE
                  </span>
                  <span
                    className={`text-4xl font-black font-mono ${
                      isPassed ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {finalPercentage}%
                    <span className="text-sm text-slate-400 font-normal">
                      {" "}
                      ({correctCount} / {KNOWLEDGE_QUESTIONS.length} CORRECT — 75% MINIMUM)
                    </span>
                  </span>
                </div>

                <span
                  className={`px-4 py-2 font-mono text-sm font-bold border ${
                    isPassed
                      ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                      : "bg-red-950/80 border-red-500 text-red-300"
                  }`}
                >
                  {isPassed ? "ASSESSMENT PASSED" : "ASSESSMENT FAILED"}
                </span>
              </div>

              {isPassed ? (
                <div className="p-5 bg-emerald-950/20 border border-emerald-500/40 text-sm font-mono text-slate-200 leading-relaxed">
                  <p className="m-0 text-emerald-300 font-bold mb-1 text-base">
                    ✓ R&amp;D ECONOMIC RIGOR CLEARANCE GRANTED.
                  </p>
                  You have demonstrated a comprehensive grasp of Investment Horizon, Risk vs Reward,
                  and Opportunity Cost. CTO Dr. Marcus Vance invites you to evaluate the Q1 Project Helix capital directive.
                </div>
              ) : (
                <div className="p-5 bg-red-950/20 border border-red-500/40 text-sm font-mono text-slate-200 leading-relaxed flex flex-col gap-3">
                  <p className="m-0 text-red-400 font-bold text-base">
                    ⚠ ECONOMIC CLEARANCE DENIED ({finalPercentage}% / 75%).
                  </p>
                  <span>
                    To safeguard enterprise capital, executive protocol requires a 75%+ score before
                    risking company liquidity on confidential research proposals. Review the core
                    research principles and retake the verification check.
                  </span>
                </div>
              )}

              {/* Review summary of questions & explanations */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-mono text-slate-400 tracking-wider uppercase font-semibold">
                  EVALUATION LOG &amp; RATIONALE:
                </span>
                {KNOWLEDGE_QUESTIONS.map((q, i) => {
                  const wasCorrect = answers[i] === q.correctAnswer;
                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 border flex flex-col gap-1.5 ${
                        wasCorrect
                          ? "border-emerald-900/60 bg-black/60 text-slate-300"
                          : "border-red-900/60 bg-red-950/15 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="text-slate-400 font-bold">{q.concept}</span>
                        <span className={wasCorrect ? "text-emerald-400" : "text-red-400 font-bold"}>
                          {wasCorrect ? "CORRECT" : "MISJUDGED"}
                        </span>
                      </div>
                      <p className="text-xs font-sans text-slate-200 m-0">“{q.question}”</p>
                      <p className="text-xs font-mono text-slate-400 m-0 pt-1 border-t border-slate-800">
                        Explanation: {q.explanation}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-2">
                {!isPassed ? (
                  <>
                    <button
                      type="button"
                      onClick={onReviewConcepts}
                      className="px-6 py-3 border border-slate-700 bg-neutral-900 hover:border-slate-500 text-xs font-mono text-slate-300 font-bold tracking-widest cursor-pointer"
                    >
                      REVIEW CONCEPTS ↺
                    </button>
                    <button
                      type="button"
                      onClick={handleRetry}
                      className="game-button red px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
                    >
                      <span>RETRY ASSESSMENT ↺</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onPass(finalPercentage)}
                    className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
                  >
                    <span>PROCEED TO PROJECT HELIX DIRECTIVE →</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
