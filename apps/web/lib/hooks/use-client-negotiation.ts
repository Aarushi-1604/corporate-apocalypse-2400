"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api-config";
import { handleBankruptcyRedirect } from "@/lib/bankruptcy";

export interface ClientDiscoveryDetails {
  deliverables: string;
  timeline: string;
  constraints: string;
  budget_expectation: number;
  budget_range_text: string;
  personality_notes: string;
}

export interface ClientScenario {
  id: string;
  client_name: string;
  client_type: string;
  executive_contact: string;
  executive_title: string;
  headline: string;
  stage_1_requirement: string;
  stage_2_discovery: ClientDiscoveryDetails;
  target_metrics: string[];
  pitch_hints?: string[];
}

export interface CompanyCapabilities {
  name: string;
  sector: string;
  innovation: number;
  brand: number;
  risk: number;
  unique_strength: string;
}

export interface NegotiationSessionResponse {
  contract_id: string;
  quarter: number;
  has_followup?: boolean;
  scenario?: ClientScenario | null;
  status: string;
  relationship_score: number;
  target_value: number;
  is_locked: boolean;
  lock_reason?: string;
  decision_summary?: string | null;
  decision_stat_deltas?: Record<string, number> | null;
  company_capabilities: CompanyCapabilities;
  active_portfolio?: Array<{
    id: string;
    quarter_signed: number;
    client_name: string;
    client_type: string;
    status: string;
    value: number;
    relationship_score: number;
    ongoing_quarterly_revenue: number;
    obligation: string;
    dispute_status: string;
    deliverable_status: string;
    summary: string;
  }>;
  total_active_contracts?: number;
  total_contract_value?: number;
  total_ongoing_quarterly_revenue?: number;
  remediation?: {
    contract_id: string;
    client_name: string;
    client_type: string;
    contract_value: number;
    base_amount: number;
    max_amount: number;
    audit_feedback: string;
    settled: boolean;
    summary?: string | null;
    stat_deltas?: Record<string, number> | null;
    compensation_paid?: number;
  };
  subordinate_briefing?: Q2SubordinateBriefing | null;
}

export interface Q2SubordinateChoice {
  tier: "conservative" | "balanced" | "aggressive";
  label: string;
  quoted_price: number;
  projected_margin: number;
  risk_profile: string;
  description: string;
}

export interface Q2SubordinateBriefing {
  speaker_title: string;
  client_name: string;
  deliverables: string;
  timeline: string;
  client_budget: number;
  delivery_cost: number;
  briefing_text: string;
  choices: Q2SubordinateChoice[];
}


export interface PitchEvaluationResult {
  status: string;
  score: number;
  client_reaction: string;
  trust_delta: number;
  new_relationship_score: number;
  suggested_price_multiplier: number;
  provider: string;
  latency_ms: number;
}

export interface DealResolutionResult {
  status: string;
  outcome: "ACCEPTED" | "COUNTEROFFER" | "REJECTED" | "WALKED_AWAY";
  quoted_price: number;
  final_revenue: number;
  explanation: string;
  stat_deltas: Record<string, number>;
  new_revenue: number;
  new_cash: number;
  new_client_satisfaction: number;
  new_market_share: number;
}

export async function fetchNegotiationSession(companyId: string): Promise<NegotiationSessionResponse> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/negotiation/session`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load client negotiation session");
  return res.json();
}

export function useNegotiationSession(companyId?: string) {
  return useQuery({
    queryKey: ["negotiation-session", companyId],
    queryFn: () => fetchNegotiationSession(companyId as string),
    enabled: !!companyId,
  });
}

export function useAdvanceDiscovery(contractId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: "tell_me_more" | "decline") => {
      const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/discovery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to advance discovery");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation-session", companyId] });
    },
  });
}

export function usePursueOrReject(contractId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (action: "pursue" | "reject") => {
      const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/pursue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error("Failed to submit pursuit choice");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation-session", companyId] });
    },
  });
}

export function useSubmitPitch(contractId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (pitch: string): Promise<PitchEvaluationResult> => {
      const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/pitch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ pitch }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to evaluate pitch");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation-session", companyId] });
    },
  });
}

export function useSubmitPriceQuote(contractId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      quoted_price,
      pitch_score,
    }: {
      quoted_price: number;
      pitch_score: number;
    }): Promise<DealResolutionResult> => {
      const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ quoted_price, pitch_score }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to submit price quote");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation-session", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-state", companyId] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}

export interface ClientRemediationResult {
  status: string;
  client_name: string;
  compensation_amount: number;
  base_amount: number;
  stat_deltas: Record<string, number>;
  summary: string;
  new_cash: number;
  new_client_satisfaction: number;
  new_brand: number;
  new_risk: number;
}

export function useSubmitClientRemediation(companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      contract_id,
      compensation_amount,
      status_update,
    }: {
      contract_id?: string;
      compensation_amount: number;
      status_update?: string;
    }): Promise<ClientRemediationResult> => {
      const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/client-remediation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contract_id, compensation_amount, status_update }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to authorize SLA remediation");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["negotiation-session", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-state", companyId] });
      queryClient.invalidateQueries({ queryKey: ["department-locks", companyId] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["press-session", companyId] });
      if (data.status === "BANKRUPT" || (data as any).bankruptcy || (data as any).bankrupt) {
        handleBankruptcyRedirect({
          bankruptcy: true,
          action_attempted: (data as any).action_attempted || `Client SLA Remediation with ${data.client_name || "Client"}`,
          required_amount: (data as any).required_amount ?? data.compensation_amount,
          available_cash: (data as any).available_cash ?? data.new_cash,
          final_score: (data as any).final_score,
          press_headline: (data as any).press_headline,
          press_body: (data as any).press_body,
        });
      }
    },
  });
}

export function useSubmitQ2SubordinateChoice(contractId: string, companyId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      choice_tier,
    }: {
      choice_tier: "conservative" | "balanced" | "aggressive";
    }): Promise<DealResolutionResult> => {
      const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/q2-subordinate-choice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ choice_tier }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to submit subordinate choice");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["negotiation-session", companyId] });
      queryClient.invalidateQueries({ queryKey: ["company-state", companyId] });
      queryClient.invalidateQueries({ queryKey: ["department-locks", companyId] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["press-session", companyId] });
    },
  });
}


