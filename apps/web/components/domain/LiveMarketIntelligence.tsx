"use client";

import { MarketView } from "@/lib/hooks/use-market";

interface LiveMarketIntelligenceProps {
  marketData: MarketView;
  onProceedToDecision: () => void;
}

export function LiveMarketIntelligence({
  marketData,
  onProceedToDecision,
}: LiveMarketIntelligenceProps) {
  const { snapshot, competitors, player_market_share, company_name, company_cash, news } =
    marketData;

  // Build unified ranking list: Player + Competitors sorted by market share
  const allEntities = [
    {
      name: company_name || "YOUR COMPANY",
      sector: "PRIMARY",
      market_share: player_market_share,
      isPlayer: true,
    },
    ...competitors.map((c) => ({
      name: c.name,
      sector: c.sector,
      market_share: c.market_share,
      isPlayer: false,
    })),
  ].sort((a, b) => b.market_share - a.market_share);

  // Maximum market share for relative bar scaling
  const maxShare = Math.max(...allEntities.map((e) => e.market_share), 25);

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto py-6">
      {/* Header Banner */}
      <div className="rounded-xl border border-amber-500/30 bg-neutral-950/80 p-6 backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-cyan-500/10 border-b border-l border-cyan-500/30 font-mono text-xs text-cyan-400">
          STAGE 2 // TELEMETRY & COMPETITIVE SURVEILLANCE
        </div>

        <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-amber-500/70 mb-2">
          <span>MACROECONOMIC RECON // QUARTER {snapshot.quarter}</span>
          <span>•</span>
          <span>LIVE MARKET INTELLIGENCE FEED</span>
        </div>

        <h2 className="text-2xl font-black tracking-wider text-white mb-2">
          NEW KALKI ECONOMIC RADAR
        </h2>
        <p className="text-neutral-400 text-sm max-w-3xl">
          Live indicators derived from central exchange telemetry. Compare your corporate footprint against rival monopolies across the sector.
        </p>
      </div>

      {/* Macro Indicators HUD (5 Futuristic Gauges) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* 1. Crude Oil */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-400 tracking-wider">CRUDE OIL (BBL)</span>
          <span className="text-2xl font-black font-mono text-amber-400">
            ${snapshot.oil_price.toFixed(1)}
          </span>
          <span className={`text-[11px] font-mono font-bold ${snapshot.oil_price > 80 ? "text-red-400" : "text-emerald-400"}`}>
            {snapshot.oil_price > 80 ? "▲ HIGH DRAG" : "● NOMINAL BAND"}
          </span>
        </div>

        {/* 2. Interest Rate */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-400 tracking-wider">INTEREST RATE</span>
          <span className="text-2xl font-black font-mono text-cyan-400">
            {snapshot.interest_rate.toFixed(2)}%
          </span>
          <span className={`text-[11px] font-mono font-bold ${snapshot.interest_rate > 5 ? "text-red-400" : "text-cyan-400"}`}>
            {snapshot.interest_rate > 5 ? "▲ TIGHTENING" : "● ACCELERATING"}
          </span>
        </div>

        {/* 3. Inflation */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-400 tracking-wider">HEADLINE INFLATION</span>
          <span className="text-2xl font-black font-mono text-red-400">
            {snapshot.inflation.toFixed(2)}%
          </span>
          <span className={`text-[11px] font-mono font-bold ${snapshot.inflation > 4 ? "text-red-400" : "text-amber-400"}`}>
            {snapshot.inflation > 4 ? "▲ SQUEEZING MARGINS" : "● MODERATE"}
          </span>
        </div>

        {/* 4. Commodity Index */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-400 tracking-wider">COMMODITY BASKET</span>
          <span className="text-2xl font-black font-mono text-purple-400">
            {snapshot.commodity_index.toFixed(1)}
          </span>
          <span className="text-[11px] font-mono font-bold text-neutral-400">
            BASE 100 INDEX
          </span>
        </div>

        {/* 5. Currency Index */}
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4 flex flex-col gap-1">
          <span className="text-[10px] font-mono text-neutral-400 tracking-wider">CURRENCY INDEX</span>
          <span className="text-2xl font-black font-mono text-emerald-400">
            {snapshot.currency_index.toFixed(1)}
          </span>
          <span className={`text-[11px] font-mono font-bold ${snapshot.currency_index < 95 ? "text-amber-400" : "text-emerald-400"}`}>
            {snapshot.currency_index < 95 ? "▼ WEAKENING" : "● ROBUST FOREX"}
          </span>
        </div>
      </div>

      {/* Competitive Intelligence + Live Wire Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Market Share Comparative Radar */}
        <div className="lg:col-span-7 rounded-xl border border-neutral-800 bg-neutral-950/80 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-black tracking-wide text-white">
                MARKET SHARE HIERARCHY
              </h3>
              <p className="text-xs text-neutral-400">
                Direct comparative positioning across sector enterprise accounts
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-400">
              YOUR SHARE: {player_market_share.toFixed(1)}%
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {allEntities.map((ent, idx) => {
              const barWidth = Math.min(100, (ent.market_share / maxShare) * 100);

              return (
                <div
                  key={ent.name}
                  className={`p-3.5 rounded-lg border transition-all ${
                    ent.isPlayer
                      ? "border-amber-500/60 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                      : "border-neutral-800/80 bg-neutral-900/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-500">
                        #{idx + 1}
                      </span>
                      <span className={`font-bold text-sm ${ent.isPlayer ? "text-amber-300" : "text-white"}`}>
                        {ent.name}
                      </span>
                      {ent.isPlayer && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500 text-black font-black">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-neutral-200">
                      {ent.market_share.toFixed(1)}%
                    </span>
                  </div>

                  {/* Meter Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        ent.isPlayer
                          ? "bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_10px_#f59e0b]"
                          : "bg-neutral-600"
                      }`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (5 cols): Live Intelligence Headlines Feed */}
        <div className="lg:col-span-5 rounded-xl border border-neutral-800 bg-neutral-950/80 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-base font-black tracking-wide text-white">
                FINANCIAL DISPATCH WIRE
              </h3>
              <p className="text-xs text-neutral-400">
                Quarterly macro bulletins and corporate rumors
              </p>
            </div>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex flex-col gap-2.5">
            {news.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded border border-neutral-800/80 bg-neutral-900/50 flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 text-[10px] font-mono text-amber-500/70">
                  <span>DISPATCH #{i + 1}</span>
                  <span>•</span>
                  <span>CONFIRMED TELEMETRY</span>
                </div>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {item}
                </p>
              </div>
            ))}
          </div>

          {/* Player Snapshot summary */}
          <div className="mt-auto p-4 rounded-lg border border-neutral-800 bg-neutral-900/60 flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">RESERVE CAPITAL:</span>
            <span className="text-amber-400 font-bold">
              ₹{company_cash.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onProceedToDecision}
          className="px-8 py-3.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-black font-mono tracking-widest flex items-center gap-3 shadow-[0_0_25px_rgba(245,158,11,0.3)] cursor-pointer"
        >
          <span>INTELLIGENCE ACQUIRED // MAKE THE CALL</span>
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
