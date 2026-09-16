"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type QuarterReport = { quarter: number; kpi_deltas: Record<string, number>; narrative: string };
export type CorporateTimes = {
  quarter: number;
  top_companies: { name: string; sector: string; revenue: number }[];
  biggest_failures: { name: string; sector: string; profit: number }[];
  market_events: string[];
  board_gossip: string[];
  economic_outlook: string;
};

export function useQuarterReport(companyId: string | undefined, quarter: number | undefined) {
  return useQuery({
    queryKey: ["quarter-report", companyId, quarter],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/reports/quarter/${quarter}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Report not available");
      return res.json() as Promise<QuarterReport>;
    },
    enabled: !!companyId && !!quarter,
  });
}

export function useCorporateTimes(quarter: number | undefined) {
  return useQuery({
    queryKey: ["corporate-times", quarter],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/corporate-times/${quarter}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load Corporate Times");
      return res.json() as Promise<CorporateTimes>;
    },
    enabled: !!quarter,
  });
}