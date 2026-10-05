"use client";

import { useState, useEffect } from "react";
import { MiniGameShell } from "./framework/MiniGameShell";
import { MiniGameConfig } from "@/types/minigames";
import { soundManager } from "@/lib/audio";
import type { ActiveEvent } from "@/lib/hooks/use-active-event";
import { respondToEvent } from "@/lib/hooks/use-active-event";
import { useQueryClient } from "@tanstack/react-query";
import { useOverlayStore } from "@/lib/store/overlay-store";
import { AlertTriangle, Clock, Radio, ShieldAlert, Sparkles, CheckCircle2 } from "lucide-react";

interface CrisisTriageGameProps {
  event: ActiveEvent;
}

export function CrisisTriageGame({ event }: CrisisTriageGameProps) {
  const queryClient = useQueryClient();
  const dismissCurrent = useOverlayStore((s) => s.dismissCurrent);
  const [submitting, setSubmitting] = useState(false);
  const [followUpText, setFollowUpText] = useState<string | null>(null);

  useEffect(() => {
    soundManager.playAlert();
  }, []);

  const handleChoice = async (optionIndex: number) => {
    soundManager.playClick();
    setSubmitting(true);
    try {
      const res = await respondToEvent(event.event_instance_id, optionIndex);
      setFollowUpText(res.follow_up_text);
      soundManager.playSuccess();
      await queryClient.invalidateQueries({ queryKey: ["company-state"] });
      setTimeout(() => {
        dismissCurrent();
        queryClient.invalidateQueries({ queryKey: ["active-event"] });
      }, 2500);
    } catch (err) {
      console.error("Failed to submit crisis response:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const deadline = new Date(event.response_deadline).getTime();
  const initialSeconds = Math.max(10, Math.floor((deadline - Date.now()) / 1000));

  const gameConfig: MiniGameConfig = {
    gameId: `crisis_triage_${event.event_instance_id}`,
    title: `Command Center Crisis Triage: ${event.category.toUpperCase()}`,
    subtitle: "High-Stakes Emergency Response Station",
    timeLimitSeconds: initialSeconds,
    briefing: {
      speaker: {
        name: "Marcus Vance",
        role: "Chief Crisis & PR Officer",
        colorTheme: "rose",
        avatarIcon: "PR",
      },
      dialogueText: `CODE RED, CEO! ${event.title}. Press and stakeholders demand an immediate response before news spreads globally. Select our strategic posture carefully.`,
      concept: {
        title: "Crisis Communications & PR Risk Control",
        category: "Strategy",
        explanation:
          "Corporate crises require balancing rapid transparency against financial liability. Indecision damages brand equity faster than an imperfect proactive mitigation.",
        takeawayKey: "PR_DAMAGE_CONTROL",
      },
      objectives: [
        "Evaluate emergency options before the countdown expires.",
        "Consider short-term financial cost vs long-term brand equity impact.",
      ],
    },
    initialData: {},
    onComplete: async () => {},
  };

  return (
    <MiniGameShell config={gameConfig}>
      {({ timeRemaining }) => (
        <div className="space-y-6">
          {/* Urgent Warning Header */}
          <div className="relative overflow-hidden rounded-xl border border-rose-600/70 bg-gradient-to-r from-rose-950/60 via-neutral-950 to-rose-950/60 p-5 shadow-2xl animate-pulse">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex h-3 w-3 rounded-full bg-rose-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1.5">
                <Radio className="h-4 w-4" /> LIVE BREAKING NEWS CRISIS
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              {event.title}
            </h2>
            <p className="text-xs text-neutral-300 mt-2 leading-relaxed font-sans">
              {event.body}
            </p>
          </div>

          {/* Follow-up result vs Option cards */}
          {followUpText ? (
            <div className="rounded-xl border border-emerald-500/60 bg-emerald-950/30 p-6 text-center space-y-3">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
              <h3 className="font-bold text-lg text-white">CRISIS RESPONSE ISSUED</h3>
              <p className="text-xs text-neutral-200 leading-relaxed font-mono">
                {followUpText}
              </p>
              <div className="text-[11px] text-neutral-400 animate-pulse">
                Updating company telemetry and returning to HQ...
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400" /> Executive Directive Options
              </h3>

              <div className="grid grid-cols-1 gap-3">
                {event.response_options.map((opt, idx) => (
                  <button
                    key={idx}
                    disabled={submitting}
                    onClick={() => handleChoice(idx)}
                    className="group relative flex items-start gap-4 rounded-xl border border-neutral-800 bg-neutral-900/80 p-4 text-left transition hover:border-cyan-500 hover:bg-cyan-950/20 disabled:opacity-50"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 text-xs font-bold text-cyan-400 group-hover:border-cyan-400">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                        {opt.label}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-0.5">
                        Execute posture #{idx + 1} across corporate communications.
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </MiniGameShell>
  );
}
