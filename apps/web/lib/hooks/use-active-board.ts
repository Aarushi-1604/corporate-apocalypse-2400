"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ActiveBoardExchange = {
  board_session_id: string;
  exchange_id: string;
  speaker: string;
  question: string;
  options: { label: string }[];
  sequence: number;
  total_exchanges: number;
};

async function fetchActiveBoard(companyId: string): Promise<ActiveBoardExchange | null> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/board/active`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to check board status");
  const data = await res.json();
  return data ?? null;
}

export function useActiveBoard(companyId: string | undefined) {
  return useQuery({
    queryKey: ["active-board", companyId],
    queryFn: () => fetchActiveBoard(companyId as string),
    enabled: !!companyId,
    refetchInterval: 3000,
  });
}

export async function respondToBoard(exchangeId: string, chosenOptionIndex: number) {
  const res = await fetch(`${API_BASE}/api/v1/board/exchanges/${exchangeId}/respond`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosen_option_index: chosenOptionIndex }),
  });
  if (!res.ok) throw new Error("Failed to submit board response");
  return res.json();
}