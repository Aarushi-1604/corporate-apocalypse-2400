"use client";

import { API_BASE } from "@/lib/api-config";

export type AdvisorResponse = { answer: string; source: string; was_blocked: boolean };

export async function askAdvisor(query: string): Promise<AdvisorResponse> {
  const res = await fetch(`${API_BASE}/api/v1/ai/advisor`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Advisor request failed");
  return res.json();
}
