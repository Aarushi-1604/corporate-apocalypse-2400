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

export type DepartmentStatus = {
  locked: boolean;
  summary: string | null;
  detail: string | null;
  headline?: string | null;
  press?: string | null;
  option_title?: string | null;
  stat_deltas?: Record<string, number> | null;
};

export type DepartmentLocks = {
  quarter: number;
  operations: DepartmentStatus;
  market: DepartmentStatus;
  rd: DepartmentStatus;
};

async function fetchDepartmentLocks(companyId: string): Promise<DepartmentLocks> {
  const res = await fetch(
    `${API_BASE}/api/v1/companies/${companyId}/departments/locks`,
    { credentials: "include" }
  );
  if (!res.ok) throw new Error("Failed to load department locks");
  return res.json();
}

export function useDepartmentLocks(companyId: string | undefined) {
  return useQuery({
    queryKey: ["department-locks", companyId],
    queryFn: () => fetchDepartmentLocks(companyId as string),
    enabled: !!companyId,
    refetchOnWindowFocus: true,
  });
}