"use client";

import { useState, FormEvent } from "react";
import { KeyRound, ArrowRight, ShieldAlert, Lock, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { API_BASE } from "@/lib/api-config";

interface VenueAccessGateProps {
  onAccessGranted: () => void;
}

export function VenueAccessGate({ onAccessGranted }: VenueAccessGateProps) {
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim() || loading) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/access-gate/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ access_code: accessCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setError(data.detail || "ACCESS CODE REJECTED. Please check with event organizers.");
        return;
      }

      // Persist in sessionStorage as well for extra local state reliability
      if (data.token) {
        sessionStorage.setItem("event_access_token", data.token);
      }

      onAccessGranted();
    } catch {
      setError("Network or telemetry link error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen w-full flex items-center justify-center bg-[#05070c] text-slate-100 p-4 font-sans selection:bg-amber-500 selection:text-black relative overflow-hidden">
      {/* Background Cyber Grid & Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none" />
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Access Gate Card */}
      <div
        className={`relative w-full max-w-md bg-[#090d16]/95 border border-amber-500/50 rounded-xl p-6 sm:p-8 shadow-[0_0_60px_rgba(0,0,0,0.9),0_0_30px_rgba(251,191,36,0.15)] backdrop-blur-xl transition-all duration-300 ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-4 mb-6">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs tracking-widest font-semibold uppercase">
            <Lock className="w-4 h-4 text-amber-400" />
            <span>SYMBITECH // VENUE PERIMETER GATE</span>
          </div>
          <span className="text-[10px] font-mono text-amber-500/80 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
            DAY-1 ACTIVE
          </span>
        </div>

        {/* Title & Context */}
        <div className="space-y-2 mb-6">
          <h1 className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2">
            <span>CORPORATE APOCALYPSE 2400</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono leading-relaxed">
            RESTRICTED ACCESS PROTOCOL: This flagship simulation is strictly restricted to verified in-person participants at SymbiTech. Enter the physical venue access code provided at registration.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="accessCodeInput"
              className="text-[11px] font-mono uppercase tracking-wider text-slate-300 flex items-center justify-between"
            >
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>VENUE ACCESS PASSCODE</span>
              </span>
              <span className="text-[10px] text-slate-500">CASE-SENSITIVE</span>
            </label>

            <div className="relative">
              <input
                id="accessCodeInput"
                type={showPassword ? "text" : "password"}
                value={accessCode}
                onChange={(e) => {
                  setAccessCode(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Enter event passkey..."
                disabled={loading}
                autoFocus
                autoComplete="off"
                className="w-full bg-slate-900/90 border border-slate-700 focus:border-amber-400 rounded-lg px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono tracking-wider transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-500/50 text-red-300 text-xs font-mono flex items-start gap-2 animate-in fade-in zoom-in-95">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{error}</p>
            </div>
          )}

          {/* Continue Button */}
          <button
            type="submit"
            disabled={!accessCode.trim() || loading}
            className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-black disabled:text-slate-500 font-mono text-xs font-bold tracking-widest uppercase flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] disabled:shadow-none active:scale-[0.98]"
          >
            {loading ? (
              <span>AUTHENTICATING PERIMETER LINK...</span>
            ) : (
              <>
                <span>CONTINUE</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex items-center justify-between">
          <span>EVENT: SYMBITECH 2026</span>
          <span>SECURITY PROTOCOL V4</span>
        </div>
      </div>
    </main>
  );
}
