"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type LeaderboardRow = {
  id: string;
  company_name: string;
  sector: string;
  final_score: number;
  rank: number;
};

async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  const res = await fetch(`${API_BASE}/api/v1/leaderboard`);
  if (!res.ok) throw new Error("Failed to load leaderboard");
  return res.json();
}

export function useLeaderboard() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
  });

  useEffect(() => {
    const channel = supabase
      .channel("leaderboard-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "leaderboard" },
        () => {
          // A row changed somewhere -- simplest correct response is to
          // re-fetch the whole ranked list via REST (it's small, cheap,
          // and guarantees correct re-ranking) rather than trying to
          // patch Realtime's raw row payload into already-ranked
          // client state by hand.
          queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}