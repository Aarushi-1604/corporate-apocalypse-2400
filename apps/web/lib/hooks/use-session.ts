"use client";

import { useQuery } from "@tanstack/react-query";

export type CompanyOut = {
  name: string;
  sector: string;
  backstory: string;
  unique_strength: string;
  unique_weakness: string;
  unique_passive_ability: string;
  cash: number;
  employees: number;
};

export type SessionData = {
  player_id: string;
  session_id: string;
  company_id: string;
  current_quarter: number;
  resumed: boolean;
  company: CompanyOut;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function fetchSession(): Promise<SessionData> {
  const res = await fetch(`${API_BASE}/api/v1/me`, { credentials: "include" });
  if (!res.ok) throw new Error("Not logged in");
  return res.json();
}

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: fetchSession,
    retry: false,
  });
}