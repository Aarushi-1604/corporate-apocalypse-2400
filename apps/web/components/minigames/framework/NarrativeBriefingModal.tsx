"use client";

import { useState, useEffect } from "react";
import { NarrativeBriefing } from "@/types/minigames";
import { soundManager } from "@/lib/audio";
import { BookOpen, Target, Play, ShieldAlert, Sparkles } from "lucide-react";

interface NarrativeBriefingModalProps {
  briefing: NarrativeBriefing;
  onStartMission: () => void;
  onSkipConcept?: () => void;
}

export function NarrativeBriefingModal({
  briefing,
  onStartMission,
}: NarrativeBriefingModalProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTypingComplete, setIsTypingComplete] = useState(false);

  useEffect(() => {
    soundManager.playHover();
    let idx = 0;
    const fullText = briefing.dialogueText;
    const interval = setInterval(() => {
      if (idx < fullText.length) {
        setDisplayedText(fullText.slice(0, idx + 1));
        idx++;
      } else {
        setIsTypingComplete(true);
        clearInterval(interval);
      }
    }, 15);

    return () => clearInterval(interval);
  }, [briefing.dialogueText]);

  const handleSkipTyping = () => {
    setDisplayedText(briefing.dialogueText);
    setIsTypingComplete(true);
  };

  const handleStart = () => {
    soundManager.playSuccess();
    onStartMission();
  };

  const themeColors = {
    cyan: "border-cyan-500/50 bg-cyan-950/30 text-cyan-400",
    emerald: "border-emerald-500/50 bg-emerald-950/30 text-emerald-400",
    amber: "border-amber-500/50 bg-amber-950/30 text-amber-400",
    rose: "border-rose-500/50 bg-rose-950/30 text-rose-400",
    purple: "border-purple-500/50 bg-purple-950/30 text-purple-400",
  };

  const currentTheme = themeColors[briefing.speaker.colorTheme || "cyan"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/90 p-6 shadow-2xl shadow-cyan-950/50">
        {/* Glow Header */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-500" />

        {/* Speaker Header */}
        <div className="flex items-center gap-4 border-b border-neutral-800 pb-4 mb-5">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-lg border font-bold text-lg ${currentTheme}`}
          >
            {briefing.speaker.avatarIcon || briefing.speaker.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white">{briefing.speaker.name}</h3>
              <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-300 font-mono">
                {briefing.speaker.role}
              </span>
            </div>
            <p className="text-xs text-neutral-400 flex items-center gap-1 mt-0.5">
              <Sparkles className="h-3 w-3 text-cyan-400" /> Narrative Mission Briefing
            </p>
          </div>
        </div>

        {/* Speech Bubble / Dialogue */}
        <div
          onClick={!isTypingComplete ? handleSkipTyping : undefined}
          className="cursor-pointer mb-5 rounded-lg border border-neutral-800 bg-neutral-950/80 p-4 text-sm text-neutral-200 leading-relaxed font-sans min-h-[90px] hover:border-neutral-700 transition"
        >
          <p>{displayedText}</p>
          {!isTypingComplete && (
            <span className="inline-block w-2 h-4 ml-1 bg-cyan-400 animate-pulse" />
          )}
        </div>

        {/* Business Concept Spotlight */}
        <div className="mb-5 rounded-lg border border-cyan-900/50 bg-cyan-950/20 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <BookOpen className="h-4 w-4" />
              <span>Core Concept: {briefing.concept.title}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-mono px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50">
              {briefing.concept.category}
            </span>
          </div>
          <p className="text-xs text-neutral-300 leading-normal">{briefing.concept.explanation}</p>
        </div>

        {/* Mission Objectives */}
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
            <Target className="h-3.5 w-3.5 text-emerald-400" /> Mission Objectives
          </h4>
          <ul className="space-y-1.5 text-xs text-neutral-300">
            {briefing.objectives.map((obj, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>{obj}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
          <div className="text-[11px] text-neutral-500 font-mono flex items-center gap-1">
            <ShieldAlert className="h-3 w-3 text-amber-400" /> Decisive choices impact engine stats
          </div>
          <button
            onClick={handleStart}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 active:scale-95 transition"
          >
            <Play className="h-4 w-4 fill-current" /> Commence Mission
          </button>
        </div>
      </div>
    </div>
  );
}
