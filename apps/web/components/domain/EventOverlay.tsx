"use client";

import type { ActiveEvent } from "@/lib/hooks/use-active-event";
import { CrisisTriageGame } from "@/components/minigames/CrisisTriageGame";

export function EventOverlay({ event }: { event: ActiveEvent }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl">
        <CrisisTriageGame event={event} />
      </div>
    </div>
  );
}