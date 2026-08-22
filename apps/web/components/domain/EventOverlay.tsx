"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { ActiveEvent } from "@/lib/hooks/use-active-event";
import { respondToEvent } from "@/lib/hooks/use-active-event";
import { useOverlayStore } from "@/lib/store/overlay-store";

const SEVERITY_COLORS: Record<string, string> = {
  green: "border-green-500",
  blue: "border-blue-500",
  yellow: "border-yellow-500",
  red: "border-red-500",
};

export function EventOverlay({ event }: { event: ActiveEvent }) {
  const queryClient = useQueryClient();
  const dismissCurrent = useOverlayStore((s) => s.dismissCurrent);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    const deadline = new Date(event.response_deadline).getTime();
    const interval = setInterval(() => {
      setRemaining(Math.max(0, Math.floor((deadline - Date.now()) / 1000)));
    }, 500);
    return () => clearInterval(interval);
  }, [event.response_deadline]);

  async function handleRespond(index: number) {
    setSubmitting(true);
    try {
      const res = await respondToEvent(event.event_instance_id, index);
      setResult(res.follow_up_text);
      await queryClient.invalidateQueries({ queryKey: ["company-state"] });
      setTimeout(() => {
        dismissCurrent();
        queryClient.invalidateQueries({ queryKey: ["active-event"] });
      }, 2000);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`w-full max-w-md rounded border-2 bg-neutral-950 p-6 ${SEVERITY_COLORS[event.severity]}`}
    >
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        {event.category} -- {remaining}s remaining
      </p>
      <h2 className="mt-2 text-xl font-bold text-white">{event.title}</h2>
      <p className="mt-2 text-neutral-300">{event.body}</p>

      {result ? (
        <p className="mt-4 text-sm text-neutral-400">{result}</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {event.response_options.map((opt, i) => (
            <button
              key={i}
              disabled={submitting}
              onClick={() => handleRespond(i)}
              className="rounded bg-white px-3 py-2 text-left text-sm font-semibold text-black disabled:opacity-50"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}