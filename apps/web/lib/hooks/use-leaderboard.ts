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
  participant_name?: string;
  masked_prn?: string;
  branch?: string;
  status?: string;
  revenue_score?: number;
  satisfaction_score?: number;
  innovation_score?: number;
  investor_score?: number;
};

async function fetchLeaderboard(): Promise<LeaderboardRow[]> {
  // Authoritative backend query which enforces deterministic tie-breaking and player join
  try {
    const res = await fetch(`${API_BASE}/api/v1/leaderboard?limit=10`);
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // If local network issue, fallback to Supabase publishable client
  }

  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("id, company_name, sector, final_score")
      .eq("excluded", false)
      .not("final_score", "is", null)
      .order("final_score", { ascending: false })
      .limit(10);

    if (!error && data) {
      return data.map((row, index) => ({
        id: row.id,
        company_name: row.company_name,
        sector: row.sector,
        final_score: Number(row.final_score),
        rank: index + 1,
        participant_name: "Executive CEO",
        status: "Completed Run",
      }));
    }
  } catch {
    // Ignore fallback errors
  }

  return [];
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
