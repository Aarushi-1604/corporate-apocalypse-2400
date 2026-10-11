"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export interface HelixOption {
  id: string;
  title: string;
  action_label: string;
  cost_cash: number;
  description: string;
  tradeoff: string;
  stat_deltas: Record<string, number>;
  press_headline: string;
  press_body: string;
}

export interface HelixProject {
  id: string;
  name: string;
  subtitle: string;
  briefing: string;
  cost_cash: number;
  options: HelixOption[];
}

export interface HelixProposalResponse {
  project: HelixProject;
  company_cash: number;
  cost_cash: number;
  can_afford: boolean;
  remaining_if_invested: number;
}

export interface ExecuteRdDecisionResult {
  status: string;
  option_id: string;
  option_title: string;
  action_label: string;
  summary: string;
  cost_cash: number;
  stat_deltas: Record<string, number>;
  press_headline: string;
  press_body: string;
  new_cash: number;
  new_innovation: number;
  new_risk: number;
  new_board_confidence: number;
}

export async function fetchRdProposal(): Promise<HelixProposalResponse> {
  const res = await fetch(`${API_BASE}/api/v1/rd/proposal`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load Project Helix proposal");
  return res.json();
}

export function useRdProposal(enabled = true) {
  return useQuery({
    queryKey: ["rd-proposal"],
    queryFn: fetchRdProposal,
    enabled,
  });
}

export function useExecuteRdDecision(companyId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      quarter,
      option_id,
    }: {
      quarter: number;
      option_id: string;
    }): Promise<ExecuteRdDecisionResult> => {
      const res = await fetch(`${API_BASE}/api/v1/rd/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quarter, option_id }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail ?? "Failed to commit R&D directive");
      }
      return res.json();
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({ queryKey: ["department-locks", companyId] });
        queryClient.invalidateQueries({ queryKey: ["company-state", companyId] });
      }
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["rd-proposal"] });
    },
  });
}
