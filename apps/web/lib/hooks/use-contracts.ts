"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type Contract = {
  id: string;
  client_name: string;
  client_type: string;
  status: string;
  value: number;
  relationship_score: number;
};

async function fetchCurrentContract(companyId: string): Promise<Contract | null> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/contracts/current`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load contract");
  const data = await res.json();
  return data ?? null;
}

export function useCurrentContract(companyId: string | undefined) {
  return useQuery({
    queryKey: ["current-contract", companyId],
    queryFn: () => fetchCurrentContract(companyId as string),
    enabled: !!companyId,
    refetchInterval: 5000,
  });
}

export async function negotiateContract(contractId: string, position: number) {
  const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/negotiate`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ position }),
  });
  if (!res.ok) throw new Error("Failed to update negotiation");
  return res.json();
}

export async function decideContract(contractId: string, action: "accept" | "decline", position: number) {
  const res = await fetch(`${API_BASE}/api/v1/contracts/${contractId}/decision`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, position }),
  });
  if (!res.ok) throw new Error("Failed to submit decision");
  return res.json();
}