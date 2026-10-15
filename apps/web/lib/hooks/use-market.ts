"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// -----------------------------------------------------------------------------
// Market Intelligence Types
// -----------------------------------------------------------------------------
export type MarketView = {
  snapshot: {
    quarter: number;
    oil_price: number;
    interest_rate: number;
    inflation: number;
    commodity_index: number;
    currency_index: number;
  };
  competitors: { name: string; sector: string; market_share: number }[];
  player_market_share: number;
  company_name: string;
  company_cash: number;
  company_brand: number;
  company_debt: number;
  news: string[];
};

export async function fetchMarket(companyId: string): Promise<MarketView> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/market`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load market data");
  return res.json();
}

export function useMarket(companyId: string | undefined) {
  return useQuery({
    queryKey: ["market", companyId],
    queryFn: () => fetchMarket(companyId as string),
    enabled: !!companyId,
  });
}

// -----------------------------------------------------------------------------
// Market Cascade Training Types & Hooks
// -----------------------------------------------------------------------------
export interface ScenarioCard {
  id: string;
  text: string;
  badge: string;
}

export interface MarketCascadeScenario {
  id: string;
  title: string;
  code: string;
  shock_name: string;
  shock_value: string;
  shock_description: string;
  cards: ScenarioCard[];
}

export interface PositionCheck {
  card_id: string;
  submitted_position: number;
  ideal_position: number;
  status: "correct" | "near" | "incorrect";
}

export interface CascadeEvaluationResult {
  scenario_id: string;
  score: number;
  passed: boolean;
  exact_matches: number;
  satisfied_pairs: number;
  total_pairs: number;
  position_results: PositionCheck[];
  correct_order: string[];
  explanations: Record<string, string>;
}

export function useMarketCascadeScenarios() {
  return useQuery<MarketCascadeScenario[]>({
    queryKey: ["market-cascade-scenarios"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/market/training/scenarios`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load cascade scenarios");
      return res.json();
    },
  });
}

export function useEvaluateCascade() {
  return useMutation<
    CascadeEvaluationResult,
    Error,
    { scenario_id: string; submitted_order: string[] }
  >({
    mutationFn: async ({ scenario_id, submitted_order }) => {
      const res = await fetch(`${API_BASE}/api/v1/market/training/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ scenario_id, submitted_order }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to evaluate cascade sequence");
      }
      return res.json();
    },
  });
}

// -----------------------------------------------------------------------------
// Strategic Decisions Types & Hooks
// -----------------------------------------------------------------------------
export interface DecisionOption {
  id: string;
  title: string;
  tagline: string;
  description: string;
  tradeoff: string;
  cost_cash: number;
  stat_deltas: Record<string, number>;
}

export interface StrategicDilemma {
  id: string;
  headline: string;
  context_brief: string;
  options: DecisionOption[];
}

export interface DecisionResult {
  status: string;
  option_id: string;
  option_title: string;
  summary: string;
  cost_cash: number;
  stat_deltas: Record<string, number>;
  press_headline: string;
  press_body: string;
  new_cash: number;
  new_market_share: number;
  new_brand: number;
  new_risk: number;
}

export function useStrategicDilemmas(companyId: string | undefined, quarter?: number) {
  return useQuery<StrategicDilemma[]>({
    queryKey: ["market-dilemmas", companyId, quarter],
    queryFn: async () => {
      const res = await fetch(
        `${API_BASE}/api/v1/companies/${companyId}/market/dilemmas`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to load strategic dilemmas");
      return res.json();
    },
    enabled: !!companyId,
  });
}

export function useExecuteMarketDecision(companyId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation<
    DecisionResult,
    Error,
    { quarter: number; dilemma_id: string; option_id: string }
  >({
    mutationFn: async ({ quarter, dilemma_id, option_id }) => {
      const res = await fetch(
        `${API_BASE}/api/v1/companies/${companyId}/market/decide`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ quarter, dilemma_id, option_id }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? "Failed to commit strategic decision");
      }
      return res.json();
    },
    onSuccess: () => {
      // Refresh market view and session caches
      queryClient.invalidateQueries({ queryKey: ["market", companyId] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
  });
}