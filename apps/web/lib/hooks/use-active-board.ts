"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api-config";

export type ActiveBoardExchange = {
  board_session_id: string;
  exchange_id: string;
  quarter: number;
  speaker: string;
  question: string;
  options: { label: string }[];
  sequence: number;
  total_exchanges: number;
};

export type BoardRespondResponse = {
  confidence_delta: number;
  session_complete: boolean;
  fired: boolean;
  new_confidence: number | null;
  completed_quarter: number | null;
  next_quarter: number | null;
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

export async function respondToBoard(
  exchangeId: string,
  chosenOptionIndex: number
): Promise<BoardRespondResponse> {
  const res = await fetch(`${API_BASE}/api/v1/board/exchanges/${exchangeId}/respond`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosen_option_index: chosenOptionIndex }),
  });
  if (!res.ok) throw new Error("Failed to submit board response");
  return res.json();
}
