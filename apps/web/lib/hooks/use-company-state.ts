"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

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

import { API_BASE } from "@/lib/api-config";

async function fetchCompanyState(companyId: string, quarter: number): Promise<CompanyStateOut> {
  // BaaS pattern: directly query Supabase publishable API
  try {
    const { data, error } = await supabase
      .from("company_states")
      .select("*")
      .eq("company_id", companyId)
      .eq("quarter", quarter)
      .maybeSingle();

    if (!error && data) {
      return {
        company_id: data.company_id,
        quarter: Number(data.quarter),
        cash: Number(data.cash),
        revenue: Number(data.revenue),
        profit: Number(data.profit),
        debt: Number(data.debt),
        stock_price: Number(data.stock_price),
        employees: Number(data.employees),
        innovation: Number(data.innovation),
        brand: Number(data.brand),
        client_satisfaction: Number(data.client_satisfaction),
        employee_satisfaction: Number(data.employee_satisfaction),
        investor_confidence: Number(data.investor_confidence),
        esg: Number(data.esg),
        risk: Number(data.risk),
        market_share: Number(data.market_share),
        board_confidence: Number(data.board_confidence),
      };
    }
  } catch {
    // Graceful fallback to API_BASE if Supabase direct client fails
  }

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
  client?: DepartmentStatus | null;
  press?: DepartmentStatus | null;
  session_status?: string | null;
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
