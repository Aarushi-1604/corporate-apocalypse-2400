"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface PressSession {
  quarter: number;
  status: "ACTIVE" | "LOCKED" | "COMPLETED";
  lock_reason?: string | null;
  headline?: string | null;
  context?: string | null;
  established_facts?: string[] | null;
  journalist?: {
    name: string;
    outlet: string;
    avatar: string;
    description: string;
  } | null;
  current_question?: string | null;
  current_exchange_index: number;
  total_exchanges: number;
  statements: string[];
  questions: string[];
  tone?: string | null;
  article_body?: string | null;
  media_verdict?: string | null;
  commitments?: string[] | null;
  score?: number | null;
  stat_deltas?: Record<string, number> | null;
}

export interface PressRespondPayload {
  statement: string;
}

export interface PressRespondResult {
  status: "ACTIVE" | "COMPLETED";
  current_exchange_index: number;
  total_exchanges: number;
  next_question?: string | null;
  tone?: string | null;
  journalist_notes?: string | null;
  statements: string[];
  questions: string[];
  headline?: string | null;
  article_body?: string | null;
  media_verdict?: string | null;
  commitments?: string[] | null;
  score?: number | null;
  stat_deltas?: Record<string, number> | null;
  new_brand?: number | null;
  new_investor_confidence?: number | null;
  new_risk?: number | null;
  new_board_confidence?: number | null;
}

async function fetchPressSession(companyId: string): Promise<PressSession> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/press/session`, {
    credentials: "include",
  });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || "Failed to load press session");
  }
  return res.json();
}

async function submitPressStatement(
  companyId: string,
  statement: string
): Promise<PressRespondResult> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/press/respond`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ statement }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Submission failed" }));
    throw new Error(err.detail || "Failed to deliver statement");
  }
  return res.json();
}

export function usePressSession(companyId: string | undefined) {
  return useQuery({
    queryKey: ["press-session", companyId],
    queryFn: () => fetchPressSession(companyId as string),
    enabled: Boolean(companyId),
    staleTime: 5000,
  });
}

export function useSubmitPressStatement(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (statement: string) => submitPressStatement(companyId as string, statement),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["press-session", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-state", companyId] });
      queryClient.invalidateQueries({ queryKey: ["department-locks", companyId] });
    },
  });
}
