"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useMarket } from "@/lib/hooks/use-market";
import { MacroIndicatorTile } from "@/components/domain/MacroIndicatorTile";

export default function MarketPage() {
  const { data: session } = useSession();
  const { data, isLoading } = useMarket(session?.company_id);

  if (isLoading || !data) return <p className="text-neutral-400">Loading market data...</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Market</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <MacroIndicatorTile label="Oil Price" value={`$${data.snapshot.oil_price.toFixed(0)}`} />
        <MacroIndicatorTile label="Interest Rate" value={`${data.snapshot.interest_rate.toFixed(1)}%`} />
        <MacroIndicatorTile label="Inflation" value={`${data.snapshot.inflation.toFixed(1)}%`} />
        <MacroIndicatorTile label="Commodities" value={data.snapshot.commodity_index.toFixed(0)} />
        <MacroIndicatorTile label="Currency Index" value={data.snapshot.currency_index.toFixed(0)} />
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Corporate News
        </h2>
        <div className="flex flex-col gap-2">
          {data.news.map((headline, i) => (
            <p key={i} className="rounded border border-neutral-800 bg-neutral-950 p-3 text-sm text-neutral-300">
              {headline}
            </p>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Competitors
        </h2>
        {data.competitors.length === 0 ? (
          <p className="text-neutral-500">No other companies active in your session yet.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.competitors.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded border border-neutral-800 bg-neutral-950 p-3"
              >
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="text-xs text-neutral-500">{c.sector}</p>
                </div>
                <p className="text-sm">{c.market_share.toFixed(1)}% share</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}