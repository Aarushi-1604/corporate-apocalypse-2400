"use client";

import { useEffect, useMemo, useState } from "react";
import { type RegisterResponse } from "@/lib/api/registration";
import { useBudgetDraft, saveBudget, lockDecisions } from "@/lib/hooks/use-budget";
import { soundManager } from "@/lib/audio";

// -----------------------------------------------------------------------------
// Categorization & Color Profiles for the 17 Backend Sectors
// -----------------------------------------------------------------------------
export interface SectorMetadata {
  id: string;
  name: string;
  category: "growth" | "operations" | "defense" | "finance";
  categoryLabel: string;
  description: string;
  accentColor: string; // Gold, Crimson, Purple, Muted Blue/Cyan
  primaryMetric: string;
  baseYield: number; // Initial points returned per 10k allocation
  saturationRate: number; // Rate at which returns diminish with spending
  yieldUnit: string;
}

export const SECTOR_METADATA: Record<string, SectorMetadata> = {
  // Strategic Growth & Innovation (Gold / Amber / Purple)
  marketing: {
    id: "marketing",
    name: "MARKETING & CAMPAIGNS",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Expands brand awareness and customer acquisition momentum.",
    accentColor: "var(--gold)",
    primaryMetric: "+ BRAND // + REVENUE",
    baseYield: 8.0,
    saturationRate: 0.000045, // Fast saturation
    yieldUnit: "pts brand",
  },
  rnd: {
    id: "rnd",
    name: "RESEARCH & DEVELOPMENT",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Drives patentable breakthroughs and technical innovation.",
    accentColor: "#a855f7", // Purple for R&D/innovation
    primaryMetric: "+ INNOVATION // + STOCK",
    baseYield: 10.0,
    saturationRate: 0.000022, // High ceiling, slower decay
    yieldUnit: "pts innov",
  },
  patents: {
    id: "patents",
    name: "PATENTS & IP MONOPOLY",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Secures proprietary technological moats and IP licenses.",
    accentColor: "#9333ea",
    primaryMetric: "+ INNOVATION // + STOCK",
    baseYield: 6.0,
    saturationRate: 0.000030,
    yieldUnit: "pts tech",
  },
  expansion: {
    id: "expansion",
    name: "TERRITORIAL EXPANSION",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Establishes physical distribution and regional outposts.",
    accentColor: "var(--gold-bright)",
    primaryMetric: "+ MARKET SHARE // + RISK",
    baseYield: 3.0,
    saturationRate: 0.000038,
    yieldUnit: "% share",
  },
  acquisitions: {
    id: "acquisitions",
    name: "CORPORATE ACQUISITIONS",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Aggressive M&A buyout of competing market players.",
    accentColor: "#d97706",
    primaryMetric: "+ MARKET SHARE // + RISK",
    baseYield: 5.0,
    saturationRate: 0.000025,
    yieldUnit: "% share",
  },

  // Core Operations & Productivity (Muted Blue / Cyan)
  hiring: {
    id: "hiring",
    name: "TALENT ACQUISITION",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Recruits specialized technical, executive, and line talent.",
    accentColor: "var(--cyan)",
    primaryMetric: "+ EMPLOYEES // + MORALE",
    baseYield: 3.0,
    saturationRate: 0.000035,
    yieldUnit: "pts morale",
  },
  automation: {
    id: "automation",
    name: "INFRASTRUCTURE AUTOMATION",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Replaces high-friction overhead with automated robotics.",
    accentColor: "#38bdf8",
    primaryMetric: "+ PROFIT // + TECH",
    baseYield: 6.0,
    saturationRate: 0.000020,
    yieldUnit: "pts profit",
  },
  manufacturing: {
    id: "manufacturing",
    name: "MANUFACTURING & FABRICATION",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Maximizes hardware throughput and production yield.",
    accentColor: "#0284c7",
    primaryMetric: "+ REVENUE // + RISK",
    baseYield: 7.0,
    saturationRate: 0.000028,
    yieldUnit: "pts rev",
  },
  supply_chain: {
    id: "supply_chain",
    name: "SUPPLY CHAIN & LOGISTICS",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Hardens procurement corridors against macro embargoes.",
    accentColor: "#14b8a6",
    primaryMetric: "- RISK // + PROFIT",
    baseYield: 5.0,
    saturationRate: 0.000025,
    yieldUnit: "pts stab",
  },
  carbon_reduction: {
    id: "carbon_reduction",
    name: "CARBON & ESG OFFSETS",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Complies with planetary environmental sustainability covenants.",
    accentColor: "#10b981",
    primaryMetric: "+ ESG INDEX // - PROFIT",
    baseYield: 10.0,
    saturationRate: 0.000040,
    yieldUnit: "pts esg",
  },

  // Defense & Risk Mitigation (Crimson / Red)
  cybersecurity: {
    id: "cybersecurity",
    name: "CYBER DEFENSE & COUNTER-INTEL",
    category: "defense",
    categoryLabel: "DEFENSE & MITIGATION",
    description: "Deploys neural firewalls to thwart espionage and data breaches.",
    accentColor: "var(--red-bright)",
    primaryMetric: "- OVERALL RISK",
    baseYield: 8.0,
    saturationRate: 0.000032,
    yieldUnit: "-pts risk",
  },
  legal: {
    id: "legal",
    name: "LEGAL SHIELD & COMPLIANCE",
    category: "defense",
    categoryLabel: "DEFENSE & MITIGATION",
    description: "Retains antitrust litigation defense and regulatory lobbyists.",
    accentColor: "var(--red)",
    primaryMetric: "- LITIGATION RISK",
    baseYield: 6.0,
    saturationRate: 0.000050,
    yieldUnit: "-pts risk",
  },
  insurance: {
    id: "insurance",
    name: "INSURANCE UNDERWRITING",
    category: "defense",
    categoryLabel: "DEFENSE & MITIGATION",
    description: "Hedges corporate balance sheet against catastrophic liabilities.",
    accentColor: "#f87171",
    primaryMetric: "- TAIL RISK",
    baseYield: 4.0,
    saturationRate: 0.000042,
    yieldUnit: "-pts risk",
  },

  // Financial Instruments & Treasury (Gold / Muted Slate)
  loans: {
    id: "loans",
    name: "DEBT FACILITIES & LOANS",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Injects immediate liquid cash while incurring long-term debt.",
    accentColor: "#fbbf24",
    primaryMetric: "+ LIQUID CASH // + DEBT",
    baseYield: 10.0,
    saturationRate: 0.000020,
    yieldUnit: "pts cash",
  },
  dividends: {
    id: "dividends",
    name: "SHAREHOLDER DIVIDENDS",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Disburses capital yield to bolster institutional investor trust.",
    accentColor: "var(--gold)",
    primaryMetric: "+ INVESTOR FAITH",
    baseYield: 6.0,
    saturationRate: 0.000036,
    yieldUnit: "pts faith",
  },
  pricing: {
    id: "pricing",
    name: "DYNAMIC PRICING MODEL",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Calibrates contract margins and price elasticity curves.",
    accentColor: "#eab308",
    primaryMetric: "+ REVENUE // - CLIENT SAT",
    baseYield: 5.0,
    saturationRate: 0.000048,
    yieldUnit: "pts rev",
  },
  layoffs: {
    id: "layoffs",
    name: "RESTRUCTURING & LAYOFFS",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Curtails payroll commitments at heavy expense to company morale.",
    accentColor: "#ef4444",
    primaryMetric: "+ CASH FLOW // - MORALE",
    baseYield: 7.0,
    saturationRate: 0.000060,
    yieldUnit: "pts cut",
  },
};

// -----------------------------------------------------------------------------
// Diminishing Marginal Yield Calculation for ₹10,000 Next Unit
// -----------------------------------------------------------------------------
export function calculateNextYield10K(catKey: string, currentAmount: number): {
  yieldValue: number;
  decayPercent: number; // How much lower than baseline
  status: "optimal" | "moderating" | "diminishing";
  statusText: string;
} {
  const meta = SECTOR_METADATA[catKey];
  const base = meta?.baseYield ?? 5.0;
  const k = meta?.saturationRate ?? 0.00003;

  // Marginal yield decays exponentially as allocation builds up: Y'(x) = Y0 * e^(-k * x)
  const currentMarginalRatio = Math.exp(-k * currentAmount);
  const yieldValue = Math.max(0.1, +(base * currentMarginalRatio).toFixed(1));
  const decayPercent = Math.max(0, Math.round((1 - currentMarginalRatio) * 100));

  if (decayPercent >= 60) {
    return {
      yieldValue,
      decayPercent,
      status: "diminishing",
      statusText: "STEEP DIMINISHING ZONE",
    };
  }
  if (decayPercent >= 30) {
    return {
      yieldValue,
      decayPercent,
      status: "moderating",
      statusText: "APPROACHING SATURATION",
    };
  }
  return {
    yieldValue,
    decayPercent,
    status: "optimal",
    statusText: "OPTIMAL YIELD BAND",
  };
}

const CATEGORY_TABS = [
  { id: "all", label: "ALL SECTORS" },
  { id: "growth", label: "GROWTH & INFLUENCE" },
  { id: "operations", label: "CORE OPERATIONS" },
  { id: "defense", label: "DEFENSE & RISK" },
  { id: "finance", label: "FINANCIAL INSTRUMENTS" },
] as const;

function formatCurrency(amount: number) {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)} CR`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)} LAKH`;
  }
  return `₹${Math.round(amount).toLocaleString()}`;
}

interface ActualOperationsScreenProps {
  sessionData: RegisterResponse;
  onBack: () => void;
  onLockComplete: () => void;
  isLocked?: boolean;
}

export function ActualOperationsScreen({
  sessionData,
  onBack,
  onLockComplete,
  isLocked = false,
}: ActualOperationsScreenProps) {
  const quarter = sessionData.current_quarter;
  const companyId = sessionData.company_id;

  const { data: draft, isLoading, error: draftError } = useBudgetDraft(companyId, quarter);

  const [amounts, setAmounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<string>("all");
  const [locking, setLocking] = useState(false);
  const [lockError, setLockError] = useState<string | null>(null);
  const [bankrupt, setBankrupt] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  // Sync draft allocations on load
  useEffect(() => {
    if (draft) {
      const initial: Record<string, number> = {};
      for (const a of draft.allocations) {
        initial[a.category] = a.amount;
      }
      setAmounts(initial);
    }
  }, [draft]);

  // Debounced Autosave (Phase 23 Engine logic)
  useEffect(() => {
    if (!companyId || !draft || !quarter || isLocked) return;
    const timeout = setTimeout(() => {
      saveBudget(companyId, quarter, amounts).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [amounts, companyId, draft, quarter, isLocked]);

  // Global ESC Key Return Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  const availableCapital = draft?.available_capital ?? sessionData.company?.cash ?? 0;
  const totalAllocated = useMemo(() => {
    return Object.values(amounts).reduce((sum, v) => sum + (v || 0), 0);
  }, [amounts]);

  const remaining = availableCapital - totalAllocated;
  const overBudget = remaining < 0;
  const allocationPercent = availableCapital > 0 ? Math.min(100, (totalAllocated / availableCapital) * 100) : 0;

  // Slider change helper
  const handleSliderChange = (category: string, value: number) => {
    if (isLocked) return;
    soundManager.playClick();
    setAmounts((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  // Preset quick adjustments
  const handleAdjust = (category: string, delta: number) => {
    if (isLocked) return;
    soundManager.playClick();
    const current = amounts[category] || 0;
    const next = Math.max(0, Math.min(availableCapital, current + delta));
    setAmounts((prev) => ({ ...prev, [category]: next }));
  };

  const handleReset = () => {
    if (isLocked) return;
    soundManager.playClick();
    const resetAlloc: Record<string, number> = {};
    Object.keys(amounts).forEach((k) => {
      resetAlloc[k] = 0;
    });
    setAmounts(resetAlloc);
  };

  // Lock Decisions Submission
  const handleLockIn = async () => {
    if (!companyId || !quarter || overBudget || locking || isLocked) return;
    setLocking(true);
    setLockError(null);
    soundManager.playSuccess();

    try {
      const res = await lockDecisions(companyId, quarter);
      if (res.bankruptcy) {
        setBankrupt(true);
      } else {
        onLockComplete();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("already ended")) {
        setGameComplete(true);
      } else {
        setLockError(err instanceof Error ? err.message : "Failed to lock capital allocation decisions.");
      }
    } finally {
      setLocking(false);
    }
  };

  // Compute portfolio diminishing returns status across all sectors
  const portfolioDiminishingStats = useMemo(() => {
    let severeCount = 0; // >= 60% decay (Red Alert)
    let moderateCount = 0; // >= 30% decay (Amber Alert)

    Object.entries(amounts).forEach(([catKey, val]) => {
      if (val > 0) {
        const { status } = calculateNextYield10K(catKey, val);
        if (status === "diminishing") severeCount++;
        else if (status === "moderating") moderateCount++;
      }
    });

    const isRedAlert = severeCount > 0;
    const isAmberAlert = !isRedAlert && moderateCount > 0;

    return {
      severeCount,
      moderateCount,
      isRedAlert,
      isAmberAlert,
    };
  }, [amounts]);

  // Sector groups definition (defined top-level in component so hook order is unconditional)
  const SECTOR_GROUPS = useMemo(() => [
    {
      id: "growth",
      name: "GROWTH & INFLUENCE",
      subline: "STRATEGIC EXPANSION, BRAND EQUITY & R&D",
      accentColor: "var(--gold)",
      glowColor: "rgba(217, 188, 122, 0.15)",
      borderColor: "rgba(218, 189, 123, 0.4)",
      sectors: ["marketing", "rnd", "patents", "expansion", "acquisitions"],
    },
    {
      id: "operations",
      name: "CORE OPERATIONS",
      subline: "INFRASTRUCTURE, LOGISTICS & WORKFORCE THROUGHPUT",
      accentColor: "var(--cyan)",
      glowColor: "rgba(114, 217, 234, 0.12)",
      borderColor: "rgba(114, 217, 234, 0.35)",
      sectors: ["hiring", "automation", "manufacturing", "supply_chain", "carbon_reduction"],
    },
    {
      id: "defense",
      name: "DEFENSE & RISK MITIGATION",
      subline: "CYBERSHIELD, REGULATORY IMMUNITY & ASSET PROTECTION",
      accentColor: "var(--red-bright)",
      glowColor: "rgba(255, 119, 112, 0.12)",
      borderColor: "rgba(255, 119, 112, 0.35)",
      sectors: ["cybersecurity", "legal", "insurance"],
    },
    {
      id: "finance",
      name: "FINANCIAL INSTRUMENTS & TREASURY",
      subline: "LIQUIDITY EXPANSION, DIVIDENDS & MARGIN CONTROL",
      accentColor: "#fbbf24",
      glowColor: "rgba(251, 191, 36, 0.12)",
      borderColor: "rgba(251, 191, 36, 0.35)",
      sectors: ["loans", "dividends", "pricing", "layoffs"],
    },
  ], []);

  // Filtered groups according to tab selection
  const visibleGroups = useMemo(() => {
    if (activeTab === "all") return SECTOR_GROUPS;
    return SECTOR_GROUPS.filter((g) => g.id === activeTab);
  }, [activeTab, SECTOR_GROUPS]);

  if (isLoading || !draft) {
    return (
      <main className="screen department-screen finance">
        <header className="system-bar">
          <div className="system-brand">
            <div className="brand-mark">
              <i /><i /><i />
            </div>
            <span>{sessionData.company?.name ? sessionData.company.name.toUpperCase() : "APEX DYNAMICS"}</span>
          </div>
          <div className="location-readout">
            <i />
            <span>FINANCE &amp; OPERATIONS // CONNECTING</span>
          </div>
        </header>
        <div className="department-environment" />
        <div style={{ display: "grid", placeItems: "center", minHeight: "80vh", color: "var(--gold)" }}>
          <p style={{ letterSpacing: "0.2em", fontFamily: "Syncopate, sans-serif" }}>
            INITIALIZING CAPITAL ALLOCATION GRID...
          </p>
        </div>
      </main>
    );
  }

  if (bankrupt) {
    return (
      <main className="screen department-screen finance finance-assessment">
        <div className="assessment-screen" style={{ border: "1px solid var(--red)" }}>
          <div className="assessment-sigil failed">
            <svg viewBox="0 0 24 24" width={32} height={32} fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M12 3 2.8 20h18.4L12 3Z" />
              <path d="M12 9v5M12 17h.01" />
            </svg>
          </div>
          <span style={{ color: "var(--red-bright)" }}>INSOLVENCY PROCEEDINGS</span>
          <h1 style={{ color: "var(--red-bright)" }}>CORPORATE BANKRUPTCY</h1>
          <p style={{ color: "#a5b4fc", margin: "18px 0" }}>
            Cash reserves have been depleted below zero. Operations cannot continue under your administration.
          </p>
          <button className="game-button gold" onClick={onBack} type="button">
            <span>[ RETURN TO EXECUTIVE ARCHIVES ]</span>
          </button>
        </div>
      </main>
    );
  }

  if (gameComplete) {
    return (
      <main className="screen department-screen finance finance-assessment">
        <div className="assessment-screen">
          <span>TERM CONCLUSION</span>
          <h1>TENURE CONCLUDED</h1>
          <p style={{ color: "#9ca3af", margin: "18px 0" }}>
            Your term as CEO has officially concluded. The corporate board has locked all administrative controls.
          </p>
          <button className="game-button gold" onClick={onBack} type="button">
            <span>[ REVIEW TERMINAL REPORTS ]</span>
          </button>
        </div>
      </main>
    );
  }

  // When Operations & Finance is locked for the active quarter:
  // Show clean executive ledger summary as requested:
  // "Q1 start budget: X You allocated A B C D E amounts to these these sectors. REMAINING BUDGET Y"
  if (isLocked) {
    return (
      <main className="screen department-screen finance finance-operations-revamp">
        <header className="system-bar">
          <div className="system-brand">
            <div className="brand-mark">
              <i /><i /><i />
            </div>
            <span>{sessionData.company?.name ? sessionData.company.name.toUpperCase() : "APEX DYNAMICS"}</span>
          </div>

          <div className="location-readout">
            <i />
            <span>OPERATIONS &amp; FINANCE // Q0{quarter} RATIFIED LEDGER</span>
          </div>

          <div className="system-stats">
            <span>QUARTER STATUS</span>
            <strong style={{ color: "#34d399" }}>LOCKED &amp; RATIFIED</strong>
            <button className="key-control" onClick={onBack} type="button">
              <kbd>ESC</kbd> BACK TO HQ
            </button>
          </div>
        </header>

        <div className="w-full flex-1 flex items-center justify-center p-6">
          <div className="market-content-cluster w-full max-w-4xl mx-auto shadow-2xl animate-in fade-in duration-200">
            <div className="market-cluster-header">
              <div className="market-cluster-header-left">
                <div
                  className="market-cluster-accent-bar"
                  style={{
                    background: "#10b981",
                    boxShadow: "0 0 12px rgba(16,185,129,0.8)",
                  }}
                />
                <div>
                  <h2 className="market-cluster-title">
                    OPERATIONS ALLOCATION LEDGER // Q0{quarter}
                  </h2>
                  <span className="market-cluster-subline">
                    CONFIRMED BOARD-RATIFIED BUDGET EXPENDITURES
                  </span>
                </div>
              </div>
              <span className="px-4 py-1.5 font-mono text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40">
                ALLOCATIONS RATIFIED
              </span>
            </div>

            <div className="market-cluster-body">
              {/* Financial Snapshot KPI cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    Q0{quarter} START BUDGET
                  </span>
                  <strong className="text-2xl font-bold font-mono text-amber-400">
                    {formatCurrency(availableCapital)}
                  </strong>
                </div>

                <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    TOTAL ALLOCATED
                  </span>
                  <strong className="text-2xl font-bold font-mono text-white">
                    {formatCurrency(totalAllocated)}
                  </strong>
                </div>

                <div className="p-4 bg-black/80 border border-slate-800 flex flex-col gap-1">
                  <span className="text-xs font-mono text-slate-400 tracking-wider">
                    REMAINING BUDGET
                  </span>
                  <strong className="text-2xl font-bold font-mono text-emerald-400">
                    {formatCurrency(remaining)}
                  </strong>
                </div>
              </div>

              {/* Breakdown of Allocated Sectors */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-mono text-slate-400 tracking-wider uppercase font-semibold">
                  COMMITTED SECTOR ALLOCATIONS
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(amounts).filter(([, val]) => val > 0).length === 0 ? (
                    <div className="col-span-2 p-4 bg-neutral-950 border border-slate-800 text-sm font-mono text-slate-400">
                      Zero additional funds were allocated to sector initiatives this quarter. Full capital preserved in liquid treasury reserves.
                    </div>
                  ) : (
                    Object.entries(amounts)
                      .filter(([, val]) => val > 0)
                      .map(([key, val]) => {
                        const meta = SECTOR_METADATA[key];
                        return (
                          <div
                            key={key}
                            className="p-3.5 bg-neutral-950/80 border border-slate-800 flex items-center justify-between"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs font-mono text-slate-400">
                                {meta?.categoryLabel ?? "OPERATIONS"}
                              </span>
                              <strong className="text-sm font-sans text-white">
                                {meta?.name ?? key.toUpperCase()}
                              </strong>
                            </div>
                            <span
                              className="font-mono text-base font-bold"
                              style={{ color: meta?.accentColor || "var(--gold)" }}
                            >
                              {formatCurrency(val)}
                            </span>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Bottom Return Action */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span className="text-xs font-mono text-slate-400 tracking-wide">
                  OPERATIONS EXPENDITURES LOCKED FOR QUARTER 0{quarter} • AWAITING END-OF-QUARTER BOARD MEETING
                </span>
                <button
                  type="button"
                  onClick={onBack}
                  className="game-button gold px-8 py-3 text-xs font-mono font-bold tracking-widest cursor-pointer"
                >
                  <span>RETURN TO HQ →</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="screen department-screen finance finance-operations-revamp">
      {/* Top Header / System Bar */}
      <header className="system-bar">

        <div className="system-brand">
          <div className="brand-mark">
            <i /><i /><i />
          </div>
          <span>{sessionData.company?.name ? sessionData.company.name.toUpperCase() : "APEX DYNAMICS"}</span>
        </div>

        <div className={`location-readout ${overBudget ? "is-danger" : ""}`}>
          <i />
          <span>FINANCE &amp; OPERATIONS // Q0{quarter} CAPITAL DISPATCH</span>
        </div>

        <div className="system-stats">
          <span>REMAINING CAPITAL</span>
          <strong style={{ color: overBudget ? "var(--red-bright)" : "var(--gold-bright)" }}>
            {formatCurrency(remaining)}
          </strong>
          <button className="key-control" onClick={onBack} type="button">
            <kbd>ESC</kbd> BACK TO HQ
          </button>
        </div>
      </header>

      {/* Futuristic Capital Depletion Command Banner */}
      <section className="capital-command-banner">
        <div className="capital-hud-left">
          <div className="capital-label-group">
            <span>AVAILABLE LIQUID CAPITAL</span>
            <strong>{formatCurrency(availableCapital)}</strong>
          </div>

          <div className="capital-split-stats">
            <div>
              <small>COMMITTED BUDGET</small>
              <b>{formatCurrency(totalAllocated)}</b>
            </div>
            <div>
              <small>FREE RESERVE</small>
              <b style={{ color: overBudget ? "var(--red-bright)" : "var(--gold)" }}>
                {formatCurrency(remaining)}
              </b>
            </div>
            <div>
              <small>ALLOTMENT LOAD</small>
              <b>{allocationPercent.toFixed(1)}%</b>
            </div>
          </div>
        </div>

        {/* Dynamic Depletion Bar & Alerts */}
        <div className="capital-gauge-box">
          <div className="capital-gauge-track">
            <div
              className={`capital-gauge-fill ${overBudget ? "danger" : ""}`}
              style={{ width: `${Math.min(100, allocationPercent)}%` }}
            />
            {overBudget && <div className="capital-gauge-overage" />}
          </div>
          <div className="capital-gauge-footer">
            <span>0.0% MIN</span>
            {overBudget ? (
              <span className="overbudget-warning">⚠️ DEFICIT: {formatCurrency(Math.abs(remaining))} OVER LIMIT</span>
            ) : portfolioDiminishingStats.isRedAlert ? (
              <span className="portfolio-diminishing-alert red">
                🔴 RED ALERT: {portfolioDiminishingStats.severeCount} SECTORS IN STEEP DIMINISHING ZONE
              </span>
            ) : portfolioDiminishingStats.isAmberAlert ? (
              <span className="portfolio-diminishing-alert amber">
                🟡 AMBER ALERT: {portfolioDiminishingStats.moderateCount} SECTORS APPROACHING SATURATION
              </span>
            ) : (
              <span className="portfolio-diminishing-alert optimal">
                🟢 CAPITAL EFFICIENCY: OPTIMAL YIELD DISPATCH
              </span>
            )}
            <span>100.0% MAX</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="capital-hud-actions">
          <button
            className="reset-alloc-btn"
            onClick={handleReset}
            disabled={isLocked}
            type="button"
          >
            RESET ALL
          </button>
          <button
            className={`game-button ${overBudget || isLocked ? "gold disabled" : "gold"}`}
            disabled={overBudget || locking || isLocked}
            onClick={handleLockIn}
            type="button"
          >
            <span>
              {isLocked
                ? "[ ALLOCATIONS RATIFIED // QUARTER LOCKED ]"
                : locking
                ? "RATIFYING..."
                : "[ RATIFY & LOCK ALLOCATIONS ]"}
            </span>
          </button>
        </div>
      </section>

      {/* Sector Category Navigation Filter */}
      <nav className="operations-filter-tabs">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`op-filter-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              soundManager.playClick();
              setActiveTab(tab.id);
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {lockError && (
        <div className="op-error-banner">
          <span>CRITICAL DISPATCH ERROR: {lockError}</span>
        </div>
      )}

      {/* Clustered Department Boxes */}
      <div className="department-clusters-container">
        {visibleGroups.map((group) => {
          // Calculate subtotal allocated within this category box
          const groupTotal = group.sectors.reduce((sum, sKey) => sum + (amounts[sKey] || 0), 0);
          const groupShare = availableCapital > 0 ? ((groupTotal / availableCapital) * 100).toFixed(1) : "0";

          return (
            <section
              key={group.id}
              className="op-category-cluster"
              style={{
                borderColor: group.borderColor,
                background: `linear-gradient(180deg, ${group.glowColor} 0%, rgba(9, 12, 14, 0.96) 60px, rgba(5, 7, 8, 0.98) 100%)`,
              }}
            >
              {/* Box Group Header */}
              <header className="op-cluster-header">
                <div className="op-cluster-header-left">
                  <div className="op-cluster-accent-bar" style={{ backgroundColor: group.accentColor }} />
                  <div>
                    <h2 className="op-cluster-title" style={{ color: group.accentColor }}>
                      {group.name}
                    </h2>
                    <span className="op-cluster-subline">{group.subline}</span>
                  </div>
                </div>

                <div className="op-cluster-header-right" style={{ borderColor: group.borderColor }}>
                  <span>DEPARTMENT SUB-TOTAL</span>
                  <strong style={{ color: group.accentColor }}>
                    {formatCurrency(groupTotal)} <small>({groupShare}%)</small>
                  </strong>
                </div>
              </header>

              {/* Sliders Grid Inside This Department Box */}
              <div className="op-cluster-sliders-grid">
                {group.sectors.map((catKey) => {
                  const meta = SECTOR_METADATA[catKey] ?? {
                    id: catKey,
                    name: catKey.toUpperCase(),
                    category: group.id as any,
                    categoryLabel: group.name,
                    description: "Corporate operational category.",
                    accentColor: group.accentColor,
                    primaryMetric: "OPERATIONS",
                  };

                  const amount = amounts[catKey] || 0;
                  const shareOfCap = availableCapital > 0 ? ((amount / availableCapital) * 100).toFixed(1) : "0";
                  const next10k = calculateNextYield10K(catKey, amount);

                  return (
                    <article
                      key={catKey}
                      className={`op-sector-card ${amount > 0 ? "has-allocation" : ""} ${next10k.status}`}
                      style={{
                        borderColor: amount > 0 ? meta.accentColor : "rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      {/* Card Top */}
                      <div className="op-card-top">
                        <div className="op-card-heading">
                          <h3 className="op-sector-title">{meta.name}</h3>
                          <span className="op-metric-badge" style={{ color: meta.accentColor }}>
                            {meta.primaryMetric}
                          </span>
                        </div>
                        <div className="op-readout-pill" style={{ borderColor: meta.accentColor }}>
                          <small>ALLOCATION</small>
                          <strong style={{ color: meta.accentColor }}>{formatCurrency(amount)}</strong>
                        </div>
                      </div>

                      <p className="op-card-desc">{meta.description}</p>

                      {/* Live Next 10K Yield & Diminishing Marginal Returns Indicator */}
                      <div className="op-marginal-yield-strip">
                        <div className="op-marginal-yield-left">
                          <small>NEXT ₹10,000 YIELD</small>
                          <strong>
                            +{next10k.yieldValue} <span className="yield-unit">{meta.yieldUnit}</span>
                          </strong>
                        </div>

                        <div className={`op-diminishing-pill ${next10k.status}`}>
                          {next10k.status === "diminishing" && <span className="alert-dot red">●</span>}
                          {next10k.status === "moderating" && <span className="alert-dot amber">●</span>}
                          {next10k.status === "optimal" && <span className="alert-dot green">●</span>}
                          <span>{next10k.statusText}</span>
                          {next10k.decayPercent > 0 && (
                            <small>(-{next10k.decayPercent}% decay)</small>
                          )}
                        </div>
                      </div>

                      {/* Slider Track and Glowing Progress */}
                      <div className="op-slider-wrapper">
                        <div
                          className="op-slider-glow-bar"
                          style={{
                            width: `${shareOfCap}%`,
                            backgroundColor: meta.accentColor,
                          }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={availableCapital}
                          step={500}
                          value={amount}
                          onChange={(e) => handleSliderChange(catKey, Number(e.target.value))}
                          className="op-futuristic-range"
                          style={{ accentColor: meta.accentColor }}
                        />
                      </div>

                      {/* Footer: Share & Steppers */}
                      <div className="op-card-footer">
                        <span className="op-share-badge">
                          {shareOfCap}% OF TOTAL CASH
                        </span>

                        <div className="op-stepper-buttons">
                          <button
                            type="button"
                            onClick={() => handleAdjust(catKey, -10000)}
                            disabled={amount <= 0}
                            className="op-step-btn"
                          >
                            -₹10K
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjust(catKey, 10000)}
                            disabled={remaining < 10000}
                            className="op-step-btn"
                          >
                            +₹10K
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAdjust(catKey, 50000)}
                            disabled={remaining < 50000}
                            className="op-step-btn"
                          >
                            +₹50K
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
