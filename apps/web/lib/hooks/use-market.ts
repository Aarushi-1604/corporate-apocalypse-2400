"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

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
  news: string[];
};

async function fetchMarket(companyId: string): Promise<MarketView> {
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