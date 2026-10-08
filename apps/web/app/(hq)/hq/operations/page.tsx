"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-session";
import { useBudgetDraft, saveBudget, lockDecisions } from "@/lib/hooks/use-budget";
import { DiminishingReturnsTrainingReactor } from "@/components/domain/DiminishingReturnsTrainingReactor";
import { ActualOperationsScreen } from "@/components/domain/ActualOperationsScreen";

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
  const [gameComplete, setGameComplete] = useState(false);

  // Demonstration gating: first visit per quarter requires completing the 3-round training simulation
  const [demoCompleted, setDemoCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (!session?.company_id || !quarter) return;
    const key = `diminishing_returns_demo_completed_${session.company_id}_q${quarter}`;
    const alreadyDone = typeof window !== "undefined" && localStorage.getItem(key) === "true";
    setDemoCompleted(alreadyDone);
  }, [session?.company_id, quarter]);

  const handleDemoComplete = () => {
    if (session?.company_id && quarter) {
      const key = `diminishing_returns_demo_completed_${session.company_id}_q${quarter}`;
      localStorage.setItem(key, "true");
    }
    setDemoCompleted(true);
  };

  const handleBackToHQ = () => {
    router.push("/");
  };

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

  if (isLoading || !draft || !quarter || demoCompleted === null) {
    return <p className="text-neutral-400">Loading operations...</p>;
  }

  // If player hasn't completed the demonstration for this quarter, render the training simulation
  if (!demoCompleted) {
    return (
      <DiminishingReturnsTrainingReactor
        onBack={handleBackToHQ}
        onComplete={handleDemoComplete}
      />
    );
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
    if (gameComplete) {
    return (
      <div className="max-w-md rounded border-2 border-neutral-600 bg-neutral-950 p-6 text-center">
        <h2 className="text-2xl font-bold">Session Complete</h2>
        <p className="mt-3 text-neutral-300">Your term as CEO has ended.</p>
        <a href="/hq/reports/annual" className="mt-6 inline-block rounded bg-white px-4 py-2 font-semibold text-black">
          View Annual Report
        </a>
      </div>
    );
  }
  return (
    <ActualOperationsScreen
      sessionData={session}
      onBack={handleBackToHQ}
      onLockComplete={async () => {
        await queryClient.invalidateQueries({ queryKey: ["session"] });
        router.push("/hq/executive");
      }}
    />
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