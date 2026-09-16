"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useCorporateTimes } from "@/lib/hooks/use-reports";

export default function CorporateTimesPage() {
  const { data: session } = useSession();
  const { data, isLoading, isError } = useCorporateTimes(session?.current_quarter);

  if (isLoading) return <p className="text-neutral-400">Loading Corporate Times...</p>;
  if (isError || !data) return <p className="text-red-500">Failed to load Corporate Times.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">The Corporate Times</h1>
      <p className="mb-6 text-sm text-neutral-500">Quarter {data.quarter} Edition</p>

      <h2 className="mb-2 text-sm font-semibold uppercase text-neutral-500">Top Performers</h2>
      {data.top_companies.map((c, i) => (
        <p key={i} className="text-neutral-300">{c.name} ({c.sector}) -- {c.revenue.toFixed(0)} revenue</p>
      ))}

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase text-neutral-500">Biggest Losses</h2>
      {data.biggest_failures.map((c, i) => (
        <p key={i} className="text-neutral-300">{c.name} ({c.sector}) -- {c.profit.toFixed(0)} profit</p>
      ))}

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase text-neutral-500">Boardroom Gossip</h2>
      {data.board_gossip.map((g, i) => <p key={i} className="text-neutral-300">{g}</p>)}

      <h2 className="mb-2 mt-6 text-sm font-semibold uppercase text-neutral-500">Market</h2>
      {data.market_events.map((m, i) => <p key={i} className="text-neutral-300">{m}</p>)}

      <p className="mt-6 italic text-neutral-500">{data.economic_outlook}</p>
    </div>
  );
}