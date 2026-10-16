"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HqErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("HQ Department Interface Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#07060a] text-slate-200 font-mono flex flex-col items-center justify-center p-6 select-none">
      <div className="w-full max-w-xl border-2 border-purple-500/80 bg-black/90 p-8 shadow-[0_0_50px_rgba(168,85,247,0.25)] flex flex-col gap-6">
        {/* Header HUD */}
        <div className="flex items-center justify-between border-b border-purple-900/60 pb-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-purple-500 animate-ping" />
            <span className="text-purple-400 font-bold tracking-widest text-xs uppercase">
              DEPARTMENT TELEMETRY ANOMALY // 500
            </span>
          </div>
          <span className="text-slate-500 text-[10px] tracking-widest">
            HQ TERMINAL
          </span>
        </div>

        {/* Narrative */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-wider text-purple-100 uppercase m-0">
            DEPARTMENT PROTOCOL DISRUPTED
          </h1>
          <p className="text-xs text-slate-400 font-sans leading-relaxed m-0">
            An unexpected error interrupted data rendering for this department. All ratified records remain safe in the mainframe.
          </p>
        </div>

        {/* Error Details */}
        <div className="p-3 bg-purple-950/30 border border-purple-500/30 rounded text-[11px] text-purple-300 break-words font-mono">
          <span className="text-purple-400 font-bold mr-2">&gt;</span>
          {error?.message || "Internal telemetry failure."}
          {error?.digest && (
            <div className="mt-1 text-[10px] text-slate-500">
              HASH: {error.digest}
            </div>
          )}
        </div>

        {/* Recovery Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-mono font-bold tracking-widest text-xs uppercase transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] cursor-pointer"
          >
            [ RE-INITIALIZE CONSOLE ]
          </button>
          <button
            type="button"
            onClick={() => router.push("/city")}
            className="w-full sm:w-auto px-6 py-3 border border-slate-700 hover:border-slate-500 bg-neutral-900 text-slate-300 font-mono font-bold tracking-widest text-xs uppercase transition-all cursor-pointer"
          >
            RETURN TO DISTRICT MAP
          </button>
          <button
            type="button"
            onClick={() => router.push("/hq")}
            className="w-full sm:w-auto px-6 py-3 border border-purple-900 hover:border-purple-600 bg-neutral-900 text-purple-300 font-mono font-bold tracking-widest text-xs uppercase transition-all cursor-pointer"
          >
            RETURN TO HQ HUB
          </button>
        </div>
      </div>
    </div>
  );
}
