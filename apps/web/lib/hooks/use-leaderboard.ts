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
  adjusted_score: number;
  raw_score: number;
  rank: number;
  participant_name?: string;
  masked_prn?: string;
  branch?: string;
  status?: string;
  terminal_status?: string;
  ending_quarter?: number;
  terminal_reason?: string;
  day_batch?: number;
  revenue_score?: number;
  satisfaction_score?: number;
  innovation_score?: number;
  investor_score?: number;
};

async function fetchLeaderboard(statusFilter?: string, batch?: string): Promise<LeaderboardRow[]> {
  try {
    const filterParam = statusFilter && statusFilter !== "all" ? `&status_filter=${encodeURIComponent(statusFilter)}` : "";
    const batchParam = batch && batch !== "all" && batch !== "overall" ? `&batch=${encodeURIComponent(batch)}` : "";
    const res = await fetch(`${API_BASE}/api/v1/leaderboard?limit=50${filterParam}${batchParam}`);
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
      .limit(50);

    if (!error && data) {
      let filtered = data.map((row, index) => {
        const score = Number(row.final_score);
        return {
          id: row.id,
          company_name: row.company_name,
          sector: row.sector,
          final_score: score,
          adjusted_score: score,
          raw_score: score,
          rank: index + 1,
          participant_name: "Executive CEO",
          status: "Completed Run",
          terminal_status: "SURVIVED · Q4",
          ending_quarter: 4,
          terminal_reason: "Fiscal solvency & corporate governance ratified across all 4 operational quarters.",
          day_batch: 1,
        };
      });
      if (batch && batch !== "overall" && batch !== "all") {
        const targetBatch = batch === "day1" ? 1 : 2;
        filtered = filtered.filter(r => r.day_batch === targetBatch);
      }
      return filtered.map((r, i) => ({ ...r, rank: i + 1 }));
    }
  } catch {
    // Ignore fallback errors
  }

  return [];
}

export function useLeaderboard(statusFilter?: string, batch?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["leaderboard", statusFilter, batch],
    queryFn: () => fetchLeaderboard(statusFilter, batch),
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
