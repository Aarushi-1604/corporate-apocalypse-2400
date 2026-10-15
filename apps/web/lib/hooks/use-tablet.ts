"use client";

import { useQuery } from "@tanstack/react-query";
import { CompanyStateOut, DepartmentLocks } from "./use-company-state";

export interface TabletEvent {
  quarter: number;
  decision_type: string;
  summary: string;
  stat_deltas?: Record<string, number> | null;
  created_at: string;
}

export interface TabletSnapshot {
  quarter: number;
  player_name: string | null;
  company_name: string;
  sector: string;
  session_status: string;
  state: CompanyStateOut;
  previous_state: CompanyStateOut | null;
  locks: DepartmentLocks;
  recent_events: TabletEvent[];
}

import { API_BASE } from "@/lib/api-config";

async function fetchTabletSnapshot(companyId: string): Promise<TabletSnapshot> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/tablet/snapshot`, {
    credentials: "include",
  });
  if (!res.ok) {
    throw new Error("Failed to load tablet telemetry");
  }
  return res.json();
}

export function useTabletSnapshot(companyId: string | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: ["tablet-snapshot", companyId],
    queryFn: () => fetchTabletSnapshot(companyId as string),
    enabled: Boolean(companyId) && enabled,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
}
