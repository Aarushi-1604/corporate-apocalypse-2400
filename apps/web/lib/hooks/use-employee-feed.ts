"use client";

import { useQuery } from "@tanstack/react-query";
import { respondToEvent } from "@/lib/hooks/use-active-event";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type EmployeeFeedItem = {
  event_instance_id: string;
  title: string;
  body: string;
  response_options: { label: string }[];
  resolved: boolean;
  follow_up_text: string | null;
};

async function fetchFeed(companyId: string): Promise<EmployeeFeedItem[]> {
  const res = await fetch(`${API_BASE}/api/v1/companies/${companyId}/employees/feed`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to load employee feed");
  const data = await res.json();
  return data.items;
}

export function useEmployeeFeed(companyId: string | undefined) {
  return useQuery({
    queryKey: ["employee-feed", companyId],
    queryFn: () => fetchFeed(companyId as string),
    enabled: !!companyId,
    refetchInterval: 6000,
  });
}

export { respondToEvent };