"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type BudgetAllocation = { category: string; amount: number };
export type BudgetDraft = { allocations: BudgetAllocation[]; available_capital: number };

async function fetchBudget(companyId: string, quarter: number): Promise<BudgetDraft> {
  const res = await fetch(
    `${API_BASE}/api/v1/companies/${companyId}/budget?quarter=${quarter}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to load budget");
  return res.json();
}

export function useBudgetDraft(companyId: string | undefined, quarter: number | undefined) {
  return useQuery({
    queryKey: ["budget", companyId, quarter],
    queryFn: () => fetchBudget(companyId as string, quarter as number),
    enabled: !!companyId && !!quarter,
  });
}

export async function saveBudget(
  companyId: string,
  quarter: number,
  allocations: Record<string, number>
) {
  const payload = {
    quarter,
    allocations: Object.entries(allocations)
      .filter(([, amount]) => amount > 0)
      .map(([category, amount]) => ({ category, amount })),
  };
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/budget`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to save budget");
}

export async function lockDecisions(companyId: string, quarter: number) {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/decisions/lock`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quarter }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Failed to lock decisions");
  }
  return res.json();
}