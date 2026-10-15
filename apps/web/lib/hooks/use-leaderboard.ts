"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

import { API_BASE } from "@/lib/api-config";

export type LeaderboardRow = {
  id: string;
  company_name: string;
  sector: string;
  final_score: number;
  rank: number;
};

async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  // BaaS pattern: directly query Supabase publishable API
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("id, company_name, sector, final_score")
      .eq("excluded", false)
      .not("final_score", "is", null)
      .order("final_score", { ascending: false })
      .limit(25);

    if (!error && data) {
      return data.map((row, index) => ({
        id: row.id,
        company_name: row.company_name,
        sector: row.sector,
        final_score: Number(row.final_score),
        rank: index + 1,
      }));
    }
  } catch {
    // Graceful fallback to API_BASE if Supabase direct client encounters network/CORS issues
  }

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
