"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, logoutSession } from "@/lib/hooks/use-session";
import { useAnnualReport } from "@/lib/hooks/use-annual-report";
import { getBankruptcyState, clearBankruptcyState } from "@/lib/bankruptcy";
import { useQueryClient } from "@tanstack/react-query";

export default function BankruptcyPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useSession();
  const { data: report } = useAnnualReport(session?.company_id);

  const [storedData, setStoredData] = useState<ReturnType<typeof getBankruptcyState>>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const data = getBankruptcyState();
    if (data) {
      setStoredData(data);
    }
  }, []);

  const companyName =
    storedData?.company_name ||
    session?.company?.name ||
    report?.company_name ||
    "ENTERPRISE CORP";

  const sector =
    session?.company?.sector ||
    report?.sector ||
    "Sector Unspecified";

  const ceoName =
    storedData?.ceo_name ||
    "CHIEF EXECUTIVE OFFICER";

  const cashAtBankruptcy =
    storedData?.available_cash ??
    (session?.company?.cash !== undefined ? session.company.cash : report?.final_cash ?? 0);

  const actionAttempted =
    storedData?.action_attempted ||
    "Mandatory Financial Commitment / Capital Allocation";

  const requiredAmount = storedData?.required_amount ?? null;
  const availableCash = storedData?.available_cash ?? cashAtBankruptcy;
  const deficit =
    requiredAmount !== null && availableCash !== null
      ? Math.max(0, requiredAmount - availableCash)
      : null;

  const finalScore =
    storedData?.final_score !== undefined && storedData?.final_score !== null
      ? storedData.final_score
      : report?.final_score ?? "CALCULATING";

  const pressHeadline =
    storedData?.press_headline ||
    `BREAKING: ${companyName.toUpperCase()} DECLARES BANKRUPTCY FOLLOWING FINANCIAL DEFAULT`;

  const pressBody =
    storedData?.press_body ||
    `${companyName} could not meet its mandatory financial obligations. The Ministry of Corporate Governance has enacted emergency liquidation procedures, immediately concluding executive tenure.`;

  const handleViewAnnualReport = () => {
    router.push("/hq/reports/annual");
  };

  const handleReturnToLogin = async () => {
    setIsLoggingOut(true);
    try {
      await logoutSession();
      clearBankruptcyState();
      queryClient.clear();
      router.replace("/login");
    } catch {
      clearBankruptcyState();
      queryClient.clear();
      router.replace("/login");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030206] text-white flex flex-col items-center justify-center p-4 sm:p-6 md:p-12 relative overflow-hidden font-mono selection:bg-red-500 selection:text-white">
      {/* Background Cyber Scanlines & Ambient Red Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(239,68,68,0.22),rgba(255,255,255,0))] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f0a0d_1px,transparent_1px),linear-gradient(to_bottom,#1f0a0d_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none" />

      {/* Main Terminal Dossier */}
      <div className="relative w-full max-w-4xl z-10 flex flex-col gap-6 animate-in fade-in duration-500">
        {/* Terminal Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b-2 border-red-600/80 pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-600" />
            </span>
            <span className="text-xs md:text-sm font-bold tracking-[0.25em] text-red-400 uppercase">
              GOVERNANCE DIRECTIVE // EMERGENCY RESOLUTION 2400-B
            </span>
          </div>
          <span className="text-[11px] font-bold tracking-widest text-red-300 bg-red-950/80 border border-red-500/60 px-3 py-1 uppercase shadow-[0_0_12px_rgba(239,68,68,0.35)]">
            TERMINAL STATUS // INSOLVENT
          </span>
        </div>

        {/* Hero Title Announcement */}
        <div className="flex flex-col gap-2 pt-2">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-red-500 m-0 uppercase font-sans drop-shadow-[0_0_25px_rgba(239,68,68,0.45)]">
            CORPORATE COLLAPSE
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold tracking-widest text-white uppercase">
              BANKRUPTCY DECLARED
            </span>
            <span className="text-xs bg-red-900/60 text-red-200 border border-red-600/60 px-2 py-0.5 font-bold uppercase">
              SESSION TERMINATED
            </span>
          </div>
          <p className="text-slate-300 text-sm sm:text-base font-sans leading-relaxed max-w-2xl mt-1">
            Your company could not meet its mandatory financial obligations. Operations, market activities, and strategic negotiations have ceased under emergency statutory liquidation.
          </p>
        </div>

        {/* Audit Data Cluster */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-neutral-950/90 border border-red-900/80 p-5 sm:p-6 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
          {/* Left Column: Identity & Status */}
          <div className="flex flex-col gap-4 border-b md:border-b-0 md:border-r border-red-950 pb-4 md:pb-0 md:pr-4">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">ENTERPRISE IDENTIFIER</span>
              <span className="text-base sm:text-lg font-bold text-white uppercase">{companyName}</span>
              <span className="text-xs text-red-400 font-bold uppercase">{sector}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">EXECUTIVE APPOINTMENT</span>
              <span className="text-sm sm:text-base font-bold text-slate-200 uppercase">{ceoName}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">ATTEMPTED FINANCIAL TRANSACTION</span>
              <span className="text-xs sm:text-sm font-bold text-amber-300 bg-amber-950/40 border border-amber-500/30 p-2 leading-snug">
                {actionAttempted}
              </span>
            </div>

            <div className="flex flex-col gap-1 pt-2">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">LEGAL STATUS</span>
              <span className="text-xs text-red-300 font-bold tracking-wider">
                INSOLVENT // IRREVERSIBLE TERMINAL STATE
              </span>
            </div>
          </div>

          {/* Right Column: Financial Discrepancy & Score */}
          <div className="flex flex-col justify-between gap-4 md:pl-4">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] tracking-widest text-slate-500 uppercase">
                CAPITAL SOLVENCY BREAKDOWN
              </span>

              <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 text-xs sm:text-sm">
                <span className="text-slate-400">CASH AVAILABLE BEFORE RATIFICATION:</span>
                <span className="font-bold text-slate-100">
                  ₹{Number(cashAtBankruptcy).toLocaleString()}
                </span>
              </div>

              {requiredAmount !== null && (
                <div className="flex items-center justify-between border-b border-neutral-900 pb-1.5 text-xs sm:text-sm">
                  <span className="text-red-400 font-bold">REQUIRED FINANCIAL COST:</span>
                  <span className="font-bold text-red-300">
                    ₹{Number(requiredAmount).toLocaleString()}
                  </span>
                </div>
              )}

              {deficit !== null && deficit > 0 ? (
                <div className="flex flex-col gap-1 border border-red-900/60 bg-red-950/40 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-red-400 font-bold uppercase">SOLVENCY CAPITAL SHORTFALL:</span>
                    <span className="font-bold text-red-300">-₹{Number(deficit).toLocaleString()}</span>
                  </div>
                  <span className="text-[11px] text-red-200/80 font-sans leading-tight">
                    Mandatory financial cost exceeded available liquid cash by ₹{Number(deficit).toLocaleString()}. Transaction rejected; cash preserved at ₹{Number(cashAtBankruptcy).toLocaleString()}; operations terminated.
                  </span>
                </div>
              ) : requiredAmount !== null && Number(requiredAmount) >= Number(availableCash) ? (
                <div className="flex flex-col gap-1 border border-amber-900/60 bg-amber-950/40 p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-400 font-bold uppercase">LIQUIDITY EXHAUSTION (ZERO CASH):</span>
                    <span className="font-bold text-amber-300">₹0 REMAINING CASH</span>
                  </div>
                  <span className="text-[11px] text-amber-200/80 font-sans leading-tight">
                    Committed financial action would leave company with exactly ₹0 cash. Under Corporate Apocalypse governance rules, zero remaining cash triggers immediate statutory bankruptcy.
                  </span>
                </div>
              ) : null}
            </div>

            {/* CEO Final Score Badge */}
            <div className="p-4 bg-gradient-to-r from-red-950/70 to-neutral-900/80 border border-red-500/40 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] tracking-widest text-slate-400 uppercase">FINAL CEO PERFORMANCE SCORE</span>
                <span className="text-xs text-slate-500">AUTHORITATIVE AUDIT RESULT</span>
              </div>
              <span className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {typeof finalScore === "number" ? `${finalScore.toFixed(1)} PTS` : finalScore}
              </span>
            </div>
          </div>
        </div>

        {/* News Bullet / Press Narrative Bulletin */}
        <div className="border border-slate-800 bg-black/80 p-4 sm:p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-red-500 bg-red-950 px-2 py-0.5 border border-red-600 uppercase">
              CORPORATE TIMES // SPECIAL DISPATCH
            </span>
            <span className="text-[11px] text-slate-500 font-mono">FINANCIAL AUDIT DIVISION</span>
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-100 uppercase tracking-wide m-0">
            {pressHeadline}
          </h4>
          <p className="text-xs sm:text-sm text-slate-400 font-sans leading-relaxed m-0">
            {pressBody}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pt-3">
          <button
            onClick={handleViewAnnualReport}
            type="button"
            className="w-full sm:w-1/2 p-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/60 transition-all shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_30px_rgba(16,185,129,0.45)] cursor-pointer active:scale-[0.99]"
          >
            [ VIEW FINAL AUDIT / ANNUAL REPORT ]
          </button>

          <button
            onClick={handleReturnToLogin}
            disabled={isLoggingOut}
            type="button"
            className="w-full sm:w-1/2 p-4 text-center text-xs sm:text-sm font-bold uppercase tracking-wider bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/60 transition-all shadow-[0_0_20px_rgba(239,68,68,0.25)] hover:shadow-[0_0_30px_rgba(239,68,68,0.45)] cursor-pointer active:scale-[0.99] disabled:opacity-50"
          >
            {isLoggingOut ? "[ TERMINATING SESSION PROTOCOL... ]" : "[ RETURN TO LOGIN ]"}
          </button>
        </div>

        {/* Statutory Subtext */}
        <p className="text-[10px] text-slate-600 text-center tracking-widest uppercase m-0 pb-4">
          CORPORATE APOCALYPSE 2400 // SYMBITECH 2026 // FINANCIAL GOVERNANCE SYSTEM SECURE TERMINATION
        </p>
      </div>
    </div>
  );
}
