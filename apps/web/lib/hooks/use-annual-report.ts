"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type AnnualReport = {
  outcome: string;
  final_score: number;
  revenue_score: number;
  satisfaction_score: number;
  innovation_score: number;
  investor_score: number;
  survival_score: number;
  risk_penalty: number;
  history: { quarter: number; revenue: number; profit: number; stock_price: number }[];
  narratives: { quarter: number; narrative: string }[];
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