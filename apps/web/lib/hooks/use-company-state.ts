"use client";

import { useQuery } from "@tanstack/react-query";

export type CompanyStateOut = {
  company_id: string;
  quarter: number;
  cash: number;
  revenue: number;
  profit: number;
  debt: number;
  stock_price: number;
  employees: number;
  innovation: number;
  brand: number;
  client_satisfaction: number;
  employee_satisfaction: number;
  investor_confidence: number;
  esg: number;
  risk: number;
  market_share: number;
  board_confidence: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchCompanyState(companyId: string, quarter: number): Promise<CompanyStateOut> {
  const res = await fetch(
    `${API_BASE}/api/v1/companies/${companyId}/state?quarter=${quarter}`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to load company state");
  return res.json();
}

export function useCompanyState(companyId: string | undefined, quarter: number | undefined) {
  return useQuery({
    queryKey: ["company-state", companyId, quarter],
    queryFn: () => fetchCompanyState(companyId as string, quarter as number),
    enabled: !!companyId && !!quarter,
  });
}