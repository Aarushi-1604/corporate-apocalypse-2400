"use client";

import { useQuery } from "@tanstack/react-query";

import { API_BASE } from "@/lib/api-config";

export type QuarterHistory = {
  quarter: number;
  revenue: number;
  profit: number;
  stock_price: number;
  cash?: number;
  client_satisfaction?: number;
  employee_satisfaction?: number;
  innovation?: number;
  investor_confidence?: number;
  brand?: number;
  esg?: number;
  risk?: number;
};

export type DecisionSummary = {
  quarter: number;
  decision_type: string;
  summary: string;
  stat_deltas?: Record<string, any>;
};

export type ClientDealSummary = {
  quarter: number;
  client_name: string;
  client_type: string;
  status: string;
  value: number;
  relationship_score: number;
};

export type PressHeadline = {
  quarter: number;
  headline: string;
  details?: string;
  reputation_impact?: string;
};

export type ScoreBreakdown = {
  revenue_score: number;
  profit_score: number;
  satisfaction_score: number;
  innovation_score: number;
  investor_score: number;
  survival_score: number;
  risk_penalty: number;
};

export type AnnualReport = {
  outcome: string; // SURVIVED, BANKRUPT, FIRED
  raw_status: string;
  ceo_name: string;
  company_name: string;
  sector: string;
  final_score: number;
  final_cash: number;
  final_kpis: Record<string, number>;
  score_breakdown: ScoreBreakdown;
  history: QuarterHistory[];
  narratives: { quarter: number; narrative: string }[];
  decisions: DecisionSummary[];
  accepted_deals: ClientDealSummary[];
  press_summaries: PressHeadline[];
  final_board_assessment: string;
  revenue_score: number;
  profit_score: number;
  satisfaction_score: number;
  innovation_score: number;
  investor_score: number;
  survival_score: number;
  risk_penalty: number;
};

export function useAnnualReport(companyId: string | undefined) {
  return useQuery({
    queryKey: ["annual-report", companyId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/reports/annual`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("NOT_AVAILABLE");
      return res.json() as Promise<AnnualReport>;
    },
    enabled: !!companyId,
    retry: false,
  });
}
