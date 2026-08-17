"use client";

import { useQuery } from "@tanstack/react-query";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type ActiveEvent = {
  event_instance_id: string;
  category: string;
  severity: "green" | "blue" | "yellow" | "red";
  title: string;
  body: string;
  response_options: { label: string }[];
  response_deadline: string;
};

async function fetchActiveEvent(companyId: string): Promise<ActiveEvent | null> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/events/active`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to check for active event");
  const data = await res.json();
  return data ?? null;
}

export function useActiveEvent(companyId: string | undefined) {
  return useQuery({
    queryKey: ["active-event", companyId],
    queryFn: () => fetchActiveEvent(companyId as string),
    enabled: !!companyId,
    refetchInterval: 4000,
  });
}

export async function respondToEvent(eventInstanceId: string, chosenOptionIndex: number) {
  const res = await fetch(`${API_BASE}/api/v1/events/${eventInstanceId}/respond`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chosen_option_index: chosenOptionIndex }),
  });
  if (!res.ok) throw new Error("Failed to respond to event");
  return res.json();
}