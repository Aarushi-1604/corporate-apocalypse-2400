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
  },
  rnd: {
    id: "rnd",
    name: "RESEARCH & DEVELOPMENT",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Drives patentable breakthroughs and technical innovation.",
    accentColor: "#a855f7", // Purple for R&D/innovation
    primaryMetric: "+ INNOVATION // + STOCK",
  },
  patents: {
    id: "patents",
    name: "PATENTS & IP MONOPOLY",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Secures proprietary technological moats and IP licenses.",
    accentColor: "#9333ea",
    primaryMetric: "+ INNOVATION // + STOCK",
  },
  expansion: {
    id: "expansion",
    name: "TERRITORIAL EXPANSION",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Establishes physical distribution and regional outposts.",
    accentColor: "var(--gold-bright)",
    primaryMetric: "+ MARKET SHARE // + RISK",
  },
  acquisitions: {
    id: "acquisitions",
    name: "CORPORATE ACQUISITIONS",
    category: "growth",
    categoryLabel: "GROWTH & INFLUENCE",
    description: "Aggressive M&A buyout of competing market players.",
    accentColor: "#d97706",
    primaryMetric: "+ MARKET SHARE // + RISK",
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
  },
  automation: {
    id: "automation",
    name: "INFRASTRUCTURE AUTOMATION",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Replaces high-friction overhead with automated robotics.",
    accentColor: "#38bdf8",
    primaryMetric: "+ PROFIT // + TECH",
  },
  manufacturing: {
    id: "manufacturing",
    name: "MANUFACTURING & FABRICATION",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Maximizes hardware throughput and production yield.",
    accentColor: "#0284c7",
    primaryMetric: "+ REVENUE // + RISK",
  },
  supply_chain: {
    id: "supply_chain",
    name: "SUPPLY CHAIN & LOGISTICS",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Hardens procurement corridors against macro embargoes.",
    accentColor: "#14b8a6",
    primaryMetric: "- RISK // + PROFIT",
  },
  carbon_reduction: {
    id: "carbon_reduction",
    name: "CARBON & ESG OFFSETS",
    category: "operations",
    categoryLabel: "CORE OPERATIONS",
    description: "Complies with planetary environmental sustainability covenants.",
    accentColor: "#10b981",
    primaryMetric: "+ ESG INDEX // - PROFIT",
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
  },
  legal: {
    id: "legal",
    name: "LEGAL SHIELD & COMPLIANCE",
    category: "defense",
    categoryLabel: "DEFENSE & MITIGATION",
    description: "Retains antitrust litigation defense and regulatory lobbyists.",
    accentColor: "var(--red)",
    primaryMetric: "- LITIGATION RISK",
  },
  insurance: {
    id: "insurance",
    name: "INSURANCE UNDERWRITING",
    category: "defense",
    categoryLabel: "DEFENSE & MITIGATION",
    description: "Hedges corporate balance sheet against catastrophic liabilities.",
    accentColor: "#f87171",
    primaryMetric: "- TAIL RISK",
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
  },
  dividends: {
    id: "dividends",
    name: "SHAREHOLDER DIVIDENDS",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Disburses capital yield to bolster institutional investor trust.",
    accentColor: "var(--gold)",
    primaryMetric: "+ INVESTOR FAITH",
  },
  pricing: {
    id: "pricing",
    name: "DYNAMIC PRICING MODEL",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Calibrates contract margins and price elasticity curves.",
    accentColor: "#eab308",
    primaryMetric: "+ REVENUE // - CLIENT SAT",
  },
  layoffs: {
    id: "layoffs",
    name: "RESTRUCTURING & LAYOFFS",
    category: "finance",
    categoryLabel: "FINANCIAL INSTRUMENTS",
    description: "Curtails payroll commitments at heavy expense to company morale.",
    accentColor: "#ef4444",
    primaryMetric: "+ CASH FLOW // - MORALE",
  },
};

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
}

export function ActualOperationsScreen({
  sessionData,
  onBack,
  onLockComplete,
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
    if (!companyId || !draft || !quarter) return;
    const timeout = setTimeout(() => {
      saveBudget(companyId, quarter, amounts).catch(() => {});
    }, 500);
    return () => clearTimeout(timeout);
  }, [amounts, companyId, draft, quarter]);

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
    soundManager.playClick();
    setAmounts((prev) => ({
      ...prev,
      [category]: value,
    }));
  };

  // Preset quick adjustments
  const handleAdjust = (category: string, delta: number) => {
    soundManager.playClick();
    const current = amounts[category] || 0;
    const next = Math.max(0, Math.min(availableCapital, current + delta));
    setAmounts((prev) => ({ ...prev, [category]: next }));
  };

  const handleReset = () => {
    soundManager.playClick();
    const resetAlloc: Record<string, number> = {};
    Object.keys(amounts).forEach((k) => {
      resetAlloc[k] = 0;
    });
    setAmounts(resetAlloc);
  };

  // Lock Decisions Submission
  const handleLockIn = async () => {
    if (!companyId || !quarter || overBudget || locking) return;
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

  // Filtered categories
  const categoriesToRender = useMemo(() => {
    const all = Object.keys(SECTOR_METADATA);
    if (activeTab === "all") return all;
    return all.filter((k) => SECTOR_METADATA[k]?.category === activeTab);
  }, [activeTab]);

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

  // Sector groups definition
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

        {/* Dynamic Depletion Bar */}
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
            ) : (
              <span>CAPACITY LIMIT (100%)</span>
            )}
            <span>100.0% MAX</span>
          </div>
        </div>

        {/* Global Controls */}
        <div className="capital-hud-actions">
          <button className="reset-alloc-btn" onClick={handleReset} type="button">
            RESET ALL
          </button>
          <button
            className={`game-button ${overBudget ? "gold disabled" : "gold"}`}
            disabled={overBudget || locking}
            onClick={handleLockIn}
            type="button"
          >
            <span>{locking ? "RATIFYING..." : "[ RATIFY & LOCK ALLOCATIONS ]"}</span>
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

                  return (
                    <article
                      key={catKey}
                      className={`op-sector-card ${amount > 0 ? "has-allocation" : ""}`}
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
