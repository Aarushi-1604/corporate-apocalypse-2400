"use client";

import { useState, useEffect } from "react";
import { MiniGameConfig } from "@/types/minigames";
import { NarrativeBriefingModal } from "./NarrativeBriefingModal";
import { soundManager } from "@/lib/audio";
import { Volume2, VolumeX, Timer, XCircle } from "lucide-react";

interface MiniGameShellProps<TInput = Record<string, unknown>, TOutput = Record<string, unknown>> {
  config: MiniGameConfig<TInput, TOutput>;
  children: (props: {
    data: TInput;
    submitMission: (output: TOutput) => void;
    timeRemaining: number | null;
  }) => React.ReactNode;
}

export function MiniGameShell<TInput = Record<string, unknown>, TOutput = Record<string, unknown>>({
  config,
  children,
}: MiniGameShellProps<TInput, TOutput>) {
  const [phase, setPhase] = useState<"briefing" | "playing" | "submitting">("briefing");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    config.timeLimitSeconds ?? null
  );

  // Timer Countdown during playing phase
  useEffect(() => {
    if (phase !== "playing" || timeRemaining === null) return;
    if (timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          soundManager.playAlert();
          return 0;
        }
        if (prev <= 10) soundManager.playAlert();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [phase, timeRemaining]);

  const toggleAudio = () => {
    const newState = soundManager.toggleSound();
    setSoundEnabled(newState);
  };

  const handleStartMission = () => {
    setPhase("playing");
  };

  const handleSubmitMission = async (output: TOutput) => {
    setPhase("submitting");
    soundManager.playSuccess();
    try {
      await config.onComplete(output);
    } catch (err) {
      console.error("Failed to save mini-game output:", err);
      setPhase("playing");
    }
  };

  return (
    <div className="relative min-h-[550px] w-full rounded-xl border border-neutral-800 bg-neutral-950 p-6 overflow-hidden shadow-2xl">
      {/* Top HUD Bar */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h2 className="font-bold text-sm text-white tracking-wide uppercase font-mono">
            {config.title}
          </h2>
          {config.subtitle && (
            <span className="text-xs text-neutral-400 border-l border-neutral-800 pl-3">
              {config.subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {timeRemaining !== null && (
            <div
              className={`flex items-center gap-1.5 font-mono text-xs font-semibold px-3 py-1 rounded border ${
                timeRemaining <= 10
                  ? "border-rose-500/80 bg-rose-950/40 text-rose-400 animate-pulse"
                  : "border-neutral-800 bg-neutral-900 text-cyan-400"
              }`}
            >
              <Timer className="h-3.5 w-3.5" />
              <span>
                {Math.floor(timeRemaining / 60)}:
                {String(timeRemaining % 60).padStart(2, "0")}
              </span>
            </div>
          )}

          <button
            onClick={toggleAudio}
            title="Toggle Sound Effects"
            className="text-neutral-400 hover:text-white transition p-1"
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-cyan-400" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {config.onCancel && (
            <button
              onClick={config.onCancel}
              className="text-neutral-500 hover:text-rose-400 transition"
              title="Exit Mission"
            >
              <XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Render Narrative Briefing Modal first */}
      {phase === "briefing" && (
        <NarrativeBriefingModal
          briefing={config.briefing}
          onStartMission={handleStartMission}
        />
      )}

      {/* Active Mission Gameplay Surface */}
      {phase === "playing" &&
        children({
          data: config.initialData,
          submitMission: handleSubmitMission,
          timeRemaining,
        })}

      {/* Submitting overlay */}
      {phase === "submitting" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm z-30">
          <div className="h-10 w-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-semibold text-cyan-400 font-mono">
            COMMITTING DECISION TO SIMULATION ENGINE...
          </p>
        </div>
      )}
    </div>
  );
}
