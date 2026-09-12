"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-session";
import { useBudgetDraft, saveBudget, lockDecisions } from "@/lib/hooks/use-budget";

const CATEGORIES = [
  "marketing", "rnd", "hiring", "layoffs", "automation", "cybersecurity",
  "legal", "supply_chain", "manufacturing", "expansion", "loans",
  "dividends", "carbon_reduction", "pricing", "acquisitions", "patents", "insurance",
];

export default function OperationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const quarter = session?.current_quarter;

  const { data: draft, isLoading } = useBudgetDraft(session?.company_id, quarter);

  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankrupt, setBankrupt] = useState(false);
  useEffect(() => {
    if (draft) {
      const initial: Record<string, number> = {};
      for (const a of draft.allocations) initial[a.category] = a.amount;
      setAmounts(initial);
    }
  }, [draft]);

  // Debounced autosave -- see Phase 12 Concepts.
  useEffect(() => {
    if (!session?.company_id || !draft || !quarter) return;
    const timeout = setTimeout(() => {
      saveBudget(session.company_id, quarter, amounts).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [amounts, session?.company_id, draft, quarter]);

  if (isLoading || !draft || !quarter) {
    return <p className="text-neutral-400">Loading budget...</p>;
  }

  if (bankrupt) {
    return (
      <div className="max-w-md rounded border-2 border-red-600 bg-neutral-950 p-6 text-center">
        <h2 className="text-2xl font-bold text-red-500">BANKRUPT</h2>
        <p className="mt-3 text-neutral-300">
          Cash reserves have run out. This company can no longer continue operating.
        </p>
        <RestartButton />
      </div>
    );
  }
  const total = Object.values(amounts).reduce((sum, v) => sum + (v || 0), 0);
  const remaining = draft.available_capital - total;
  const overBudget = remaining < 0;

  async function handleLock() {
    if (!session?.company_id || !quarter) return;
    setLocking(true);
    setError(null);
    try {
      const res = await lockDecisions(session.company_id, quarter);
      if (res.bankruptcy) {
        setBankrupt(true);
      } else {
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        router.push("/hq/executive");
      } 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLocking(false);
    }
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Operations -- Q{quarter}</h1>
      <p className={`mb-6 text-sm ${overBudget ? "text-red-500" : "text-neutral-400"}`}>
        Remaining budget: {remaining.toFixed(0)} / {draft.available_capital.toFixed(0)}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CATEGORIES.map((category) => (
          <div key={category}>
            <label className="mb-1 flex justify-between text-sm">
              <span className="capitalize">{category.replace("_", " ")}</span>
              <span>{(amounts[category] || 0).toFixed(0)}</span>
            </label>
            <input
              type="range"
              min={0}
              max={draft.available_capital}
              step={500}
              value={amounts[category] || 0}
              onChange={(e) => setAmounts({ ...amounts, [category]: Number(e.target.value) })}
              className="w-full"
            />
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

      <button
        onClick={handleLock}
        disabled={overBudget || locking}
        className="mt-8 rounded bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
      >
        {locking ? "Locking in..." : "Lock In Decisions"}
      </button>

    </div>
  );
}

function RestartButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [restarting, setRestarting] = useState(false);

  async function handleRestart() {
    setRestarting(true);
    try {
      const { restartSession } = await import("@/lib/hooks/use-restart");
      await restartSession();
      queryClient.clear();
      router.push("/hq/executive");
    } finally {
      setRestarting(false);
    }
  }

  return (
    <button
      onClick={handleRestart}
      disabled={restarting}
      className="mt-6 rounded bg-white px-4 py-2 font-semibold text-black disabled:opacity-50"
    >
      {restarting ? "Assigning new company..." : "Accept a New Appointment"}
    </button>
  );
}