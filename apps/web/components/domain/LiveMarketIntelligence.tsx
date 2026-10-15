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
    <div className="flex flex-col gap-6 w-full py-2">
      {/* Header Cluster */}
      <div className="market-content-cluster !m-0 !max-w-none w-full">
        <div className="market-cluster-header">
          <div className="market-cluster-header-left">
            <div className="market-cluster-accent-bar" />
            <div>
              <h2 className="market-cluster-title">
                CENTRAL RADAR &amp; COMPETITIVE SURVEILLANCE
              </h2>
              <span className="market-cluster-subline">
                NEW KALKI ECONOMIC TELEMETRY // Q0{snapshot.quarter} LIVE SURVEILLANCE FEED
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] text-red-400 bg-red-950/60 border border-red-500/40 px-3 py-1 font-bold">
            STAGE 02 // RECONNAISSANCE
          </span>
        </div>

        <div className="market-cluster-body">
          {/* Macro Indicators Grid (5 Futuristic HUD Readouts) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
            {/* 1. Crude Oil */}
            <div className="border border-slate-800/90 bg-black/70 p-4 flex flex-col gap-1.5">
              <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">CRUDE OIL (BBL)</span>
              <strong className="text-2xl font-bold font-mono text-red-400">
                ${snapshot.oil_price.toFixed(1)}
              </strong>
              <span className={`text-xs font-mono font-bold ${snapshot.oil_price > 80 ? "text-red-400" : "text-emerald-400"}`}>
                {snapshot.oil_price > 80 ? "▲ HIGH DRAG" : "● NOMINAL BAND"}
              </span>
            </div>

            {/* 2. Interest Rate */}
            <div className="border border-slate-800/90 bg-black/70 p-4 flex flex-col gap-1.5">
              <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">INTEREST RATE</span>
              <strong className="text-2xl font-bold font-mono text-amber-400">
                {snapshot.interest_rate.toFixed(2)}%
              </strong>
              <span className={`text-xs font-mono font-bold ${snapshot.interest_rate > 5 ? "text-red-400" : "text-cyan-400"}`}>
                {snapshot.interest_rate > 5 ? "▲ TIGHTENING" : "● ACCELERATING"}
              </span>
            </div>

            {/* 3. Inflation */}
            <div className="border border-slate-800/90 bg-black/70 p-4 flex flex-col gap-1.5">
              <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">HEADLINE INFLATION</span>
              <strong className="text-2xl font-bold font-mono text-red-400">
                {snapshot.inflation.toFixed(2)}%
              </strong>
              <span className={`text-xs font-mono font-bold ${snapshot.inflation > 4 ? "text-red-400" : "text-amber-400"}`}>
                {snapshot.inflation > 4 ? "▲ SQUEEZING MARGINS" : "● MODERATE"}
              </span>
            </div>

            {/* 4. Commodity Index */}
            <div className="border border-slate-800/90 bg-black/70 p-4 flex flex-col gap-1.5">
              <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">COMMODITY BASKET</span>
              <strong className="text-2xl font-bold font-mono text-purple-400">
                {snapshot.commodity_index.toFixed(1)}
              </strong>
              <span className="text-xs font-mono font-bold text-slate-400">
                BASE 100 INDEX
              </span>
            </div>

            {/* 5. Currency Index */}
            <div className="border border-slate-800/90 bg-black/70 p-4 flex flex-col gap-1.5">
              <span className="text-xs font-mono text-slate-400 tracking-wider font-semibold">CURRENCY INDEX</span>
              <strong className="text-2xl font-bold font-mono text-emerald-400">
                {snapshot.currency_index.toFixed(1)}
              </strong>
              <span className={`text-xs font-mono font-bold ${snapshot.currency_index < 95 ? "text-amber-400" : "text-emerald-400"}`}>
                {snapshot.currency_index < 95 ? "▼ WEAKENING" : "● ROBUST FOREX"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Radar & Financial Wire Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Market Share Comparative Radar */}
        <div className="lg:col-span-7 border border-slate-800 bg-neutral-950/90 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-sans tracking-wide text-white uppercase">
                MARKET SHARE CONGLOMERATE HIERARCHY
              </h3>
              <p className="text-xs font-mono text-slate-400 m-0">
                Direct comparative positioning across sector enterprise accounts
              </p>
            </div>
            <span className="px-3 py-1 bg-red-950/60 border border-red-500/40 text-xs font-mono text-red-400 font-bold">
              YOUR SHARE: {player_market_share.toFixed(1)}%
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {allEntities.map((ent, idx) => {
              const barWidth = Math.min(100, (ent.market_share / maxShare) * 100);

              return (
                <div
                  key={`${ent.name}-${idx}-${ent.isPlayer ? "player" : "comp"}`}
                  className={`p-3.5 border transition-all ${
                    ent.isPlayer
                      ? "border-red-500/70 bg-red-950/25 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                      : "border-slate-800/80 bg-black/60"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs font-bold text-slate-400">
                        0{idx + 1}
                      </span>
                      <span className={`font-bold font-sans text-sm ${ent.isPlayer ? "text-red-300" : "text-white"}`}>
                        {ent.name}
                      </span>
                      {ent.isPlayer && (
                        <span className="px-1.5 py-0.5 text-[10px] font-mono bg-red-500 text-black font-black">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-200">
                      {ent.market_share.toFixed(1)}%
                    </span>
                  </div>

                  {/* Meter Track */}
                  <div className="w-full h-2.5 bg-neutral-900 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        ent.isPlayer
                          ? "bg-gradient-to-r from-red-600 to-red-400 shadow-[0_0_10px_#ef4444]"
                          : "bg-slate-700"
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
        <div className="lg:col-span-5 border border-slate-800 bg-neutral-950/90 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3.5 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold font-sans tracking-wide text-white uppercase">
                CENTRAL WIRE DISPATCH
              </h3>
              <p className="text-xs font-mono text-slate-400 m-0">
                Quarterly macro bulletins and corporate rumors
              </p>
            </div>
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="flex flex-col gap-3">
            {news.map((item, i) => (
              <div
                key={i}
                className="p-3.5 border border-slate-800/80 bg-black/60 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2 text-xs font-mono text-red-400/90">
                  <span>DISPATCH 0{i + 1}</span>
                  <span>•</span>
                  <span>CONFIRMED TELEMETRY</span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed font-sans m-0">
                  {item}
                </p>
              </div>
            ))}
          </div>

          {/* Player Snapshot summary */}
          <div className="mt-auto p-4 border border-slate-800 bg-black/80 flex items-center justify-between text-sm font-mono">
            <span className="text-slate-400">LIQUID CASH RESERVES:</span>
            <span className="text-amber-400 font-bold text-base">
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
          className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
        >
          <span>PROCEED TO STRATEGIC DIRECTIVE →</span>
        </button>
      </div>
    </div>
  );
}
