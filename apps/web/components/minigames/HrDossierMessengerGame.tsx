"use client";

import { useState } from "react";
import { soundManager } from "@/lib/audio";
import { respondToEvent, type EmployeeFeedItem } from "@/lib/hooks/use-employee-feed";
import { useQueryClient } from "@tanstack/react-query";
import { UserCheck, MessageSquare, ShieldAlert, Award, FileText, CheckCircle2 } from "lucide-react";

interface HrDossierMessengerGameProps {
  item: EmployeeFeedItem;
  companyId: string;
}

export function HrDossierMessengerGame({ item, companyId }: HrDossierMessengerGameProps) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  const handleRespond = async (index: number) => {
    soundManager.playClick();
    setSubmitting(true);
    try {
      await respondToEvent(item.event_instance_id, index);
      soundManager.playSuccess();
      await queryClient.invalidateQueries({ queryKey: ["employee-feed", companyId] });
      await queryClient.invalidateQueries({ queryKey: ["company-state"] });
    } catch (err) {
      console.error("Failed to respond to HR item:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCardHover = () => {
    soundManager.playHover();
  };

  return (
    <div
      onMouseEnter={handleCardHover}
      className={`relative overflow-hidden rounded-xl border transition-all duration-300 ${
        item.resolved
          ? "border-neutral-800 bg-neutral-950/50 opacity-70"
          : "border-purple-900/50 bg-neutral-900/80 shadow-lg shadow-purple-950/20 hover:border-purple-500/60"
      } p-5`}
    >
      {/* Employee Dossier Header */}
      <div className="flex items-center justify-between mb-3 border-b border-neutral-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-950/40 font-mono text-sm font-bold text-purple-300">
            HR
          </div>
          <div>
            <span className="text-[10px] font-mono text-purple-400 uppercase tracking-widest flex items-center gap-1">
              <FileText className="h-3 w-3" /> Talent & Ethics Dossier #
              {item.event_instance_id.slice(0, 6)}
            </span>
            <h3 className="font-bold text-base text-white">{item.title}</h3>
          </div>
        </div>

        <span
          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
            item.resolved
              ? "border-neutral-700 bg-neutral-900 text-neutral-400"
              : "border-purple-500/50 bg-purple-950/50 text-purple-300 animate-pulse"
          }`}
        >
          {item.resolved ? "RESOLVED" : "ACTION REQUIRED"}
        </span>
      </div>

      {/* Case Details Chat Bubble */}
      <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 p-4 font-sans text-xs text-neutral-300 leading-relaxed">
        <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400 mb-1">
          <MessageSquare className="h-3.5 w-3.5 text-purple-400" /> Employee Relations Report:
        </div>
        <p>{item.body}</p>
      </div>

      {/* Response Resolution vs Option Buttons */}
      {item.resolved ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-900/40 bg-emerald-950/20 p-3 text-xs text-emerald-300 font-mono">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
          <div>
            <span className="font-bold">Executive Order Executed:</span>
            <p className="mt-0.5 text-neutral-300">{item.follow_up_text}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-[11px] font-mono text-neutral-400 uppercase tracking-wider flex items-center gap-1">
            <UserCheck className="h-3.5 w-3.5 text-purple-400" /> Select CEO Resolution Policy:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {item.response_options.map((opt, idx) => (
              <button
                key={idx}
                disabled={submitting}
                onClick={() => handleRespond(idx)}
                className="group relative flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-left text-xs font-semibold text-neutral-200 transition hover:border-purple-500 hover:bg-purple-950/30 hover:text-white disabled:opacity-50"
              >
                <span>{opt.label}</span>
                <span className="text-[10px] font-mono text-purple-400 group-hover:translate-x-0.5 transition">
                  Execute →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
