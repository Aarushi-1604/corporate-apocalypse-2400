"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useLeaderboard } from "@/lib/hooks/use-leaderboard";

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const { data: rows, isLoading, isError } = useLeaderboard();

  if (isLoading) return <p className="text-neutral-400">Loading leaderboard...</p>;
  if (isError || !rows) return <p className="text-red-500">Failed to load leaderboard.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Leaderboard</h1>

      {rows.length === 0 && (
        <p className="text-neutral-500">No completed games yet -- scores appear here once a session ends.</p>
      )}

      <div className="flex flex-col gap-1">
        {rows.map((row) => {
          const isYou = session?.company.name === row.company_name;
          return (
            <div
              key={row.id}
              className={`flex items-center justify-between rounded border p-3 ${
                isYou ? "border-white bg-neutral-900" : "border-neutral-800 bg-neutral-950"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-6 text-right font-mono text-neutral-500">{row.rank}</span>
                <div>
                  <p className="font-semibold">{row.company_name}{isYou && " (you)"}</p>
                  <p className="text-xs text-neutral-500">{row.sector}</p>
                </div>
              </div>
              <span className="text-lg font-bold">{row.final_score.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}