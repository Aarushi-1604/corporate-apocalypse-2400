"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { ActiveBoardExchange } from "@/lib/hooks/use-active-board";
import { respondToBoard } from "@/lib/hooks/use-active-board";
import { restartSession } from "@/lib/hooks/use-restart";
import { useOverlayStore } from "@/lib/store/overlay-store";
const SPEAKER_LABELS: Record<string, string> = {
  chairperson: "Chairperson",
  lead_investor: "Lead Investor",
  cfo: "CFO",
  independent_director: "Independent Director",
  employee_rep: "Employee Representative",
  government_observer: "Government Observer",
};

export function BoardSessionOverlay({ exchange }: { exchange: ActiveBoardExchange }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const dismissCurrent = useOverlayStore((s) => s.dismissCurrent);
  const [submitting, setSubmitting] = useState(false);
  const [fired, setFired] = useState(false);
  const [restarting, setRestarting] = useState(false);

  async function handleRespond(index: number) {
    setSubmitting(true);
    try {
      const res = await respondToBoard(exchange.exchange_id, index);
      await queryClient.invalidateQueries({ queryKey: ["active-board"] });

      if (res.session_complete && res.fired) {
        setFired(true);
        return; // keep overlay open to show the TERMINATED card
      }

      if (res.session_complete) {
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        await queryClient.invalidateQueries({ queryKey: ["company-state"] });
      }

      dismissCurrent(); // question answered -- close so the next poll can bring the next one (or nothing, if survived)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Something went wrong."); // temporary, replace with inline UI later
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRestart() {
    setRestarting(true);
    try {
      await restartSession();
      queryClient.clear();
      dismissCurrent(); // close the TERMINATED card before navigating away
      router.push("/hq/executive");
    } finally {
      setRestarting(false);
    }
  }

  if (fired) {
    return (
      <div className="w-full max-w-md rounded border-2 border-red-600 bg-neutral-950 p-6 text-center">
        <h2 className="text-2xl font-bold text-red-500">TERMINATED</h2>
        <p className="mt-3 text-neutral-300">
          The board has voted to remove you as CEO effective immediately.
        </p>
        <button
          onClick={handleRestart}
          disabled={restarting}
          className="mt-6 rounded bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
        >
          {restarting ? "Assigning new company..." : "Accept a New Appointment"}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md rounded border-2 border-red-700 bg-neutral-950 p-6">
      <p className="text-xs uppercase tracking-wide text-neutral-500">
        Emergency Board Session -- {exchange.sequence + 1} / {exchange.total_exchanges}
      </p>
      <h2 className="mt-2 text-lg font-bold">{SPEAKER_LABELS[exchange.speaker] ?? exchange.speaker}</h2>
      <p className="mt-2 text-neutral-300">{exchange.question}</p>

      <div className="mt-4 flex flex-col gap-2">
        {exchange.options.map((opt, i) => (
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
    </div>
  );
}