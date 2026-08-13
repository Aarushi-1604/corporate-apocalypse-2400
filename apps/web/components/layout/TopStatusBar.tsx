"use client";

import { useSession } from "@/lib/hooks/use-session";

export function TopStatusBar() {
  const { data } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950 px-6 py-3">
      <span className="font-semibold">{data?.company.name ?? "Loading..."}</span>
      <div className="flex items-center gap-6 text-sm text-neutral-400">
        <span>Cash: {data ? data.company.cash.toFixed(0) : "--"}</span>
        <span>Q1</span>
        <span>🔔 0</span>
      </div>
    </header>
  );
}