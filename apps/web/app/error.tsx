"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for client telemetry
    console.error("Critical interface error caught by root boundary:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07060a] text-slate-200 font-mono flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-xl border-2 border-red-500/80 bg-black/90 p-8 shadow-[0_0_50px_rgba(239,68,68,0.25)] flex flex-col gap-6">
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-red-900/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
            <span className="text-red-400 font-bold tracking-widest text-xs uppercase">
              CRITICAL SYSTEM ANOMALY // 500
            </span>
          </div>
          <span className="text-slate-500 text-[10px] tracking-widest">
            NODE: KALKI-01
          </span>
        </div>

        {/* Diagnostic Narrative */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-wider text-red-100 uppercase m-0">
            INTERFACE TELEMETRY INTERRUPTED
          </h1>
          <p className="text-xs text-slate-400 font-sans leading-relaxed m-0">
            A client-side runtime exception occurred during data synchronization. System integrity is preserved in database storage.
          </p>
        </div>

        {/* Error Details Box */}
        <div className="p-3 bg-red-950/30 border border-red-500/30 rounded text-[11px] text-red-300 break-words font-mono">
          <span className="text-red-500 font-bold mr-2">&gt;</span>
          {error?.message || "An unexpected rendering fault disrupted the active console."}
          {error?.digest && (
            <div className="mt-1 text-[10px] text-slate-500">
              DIGEST HASH: {error.digest}
            </div>
          )}
        </div>

        {/* Recovery Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-500 text-black font-mono font-bold tracking-widest text-xs uppercase transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] cursor-pointer"
          >
            [ RE-INITIALIZE INTERFACE ]
          </button>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/city";
            }}
            className="w-full sm:w-auto px-6 py-3 border border-slate-700 hover:border-slate-500 bg-neutral-900 text-slate-300 font-mono font-bold tracking-widest text-xs uppercase transition-all cursor-pointer"
          >
            RETURN TO DISTRICT MAP
          </button>
        </div>
      </div>
    </div>
  );
}
