"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { Tablet, X, ChevronRight, Activity, TrendingUp, TrendingDown, Minus, ShieldAlert, Award, FileText, CheckCircle2, Lock, Radio } from "lucide-react";
import { useSession } from "@/lib/hooks/use-session";
import { useTabletSnapshot } from "@/lib/hooks/use-tablet";
import { soundManager } from "@/lib/audio";

export function HolographicTablet() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "kpis" | "activities" | "events">("status");
  const tabletRef = useRef<HTMLDivElement>(null);

  // Check if current route is login or registration
  const isAuthRoute = pathname === "/login" || pathname === "/" || pathname === "/assignment";

  const { data: session, isLoading: isSessionLoading } = useSession();
  const companyId = session?.company_id;

  const { data: tabletData, isLoading: isTabletLoading } = useTabletSnapshot(companyId, isOpen);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        soundManager.playClick();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Click outside to close (without interfering with tablet interactions)
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (tabletRef.current && !tabletRef.current.contains(e.target as Node)) {
      soundManager.playClick();
      setIsOpen(false);
    }
  };

  const handleToggle = () => {
    if (isOpen) {
      soundManager.playClick();
      setIsOpen(false);
    } else {
      soundManager.playHover();
      setIsOpen(true);
    }
  };

  const currentQ = tabletData?.quarter ?? session?.current_quarter ?? 1;
  const companyName = tabletData?.company_name ?? session?.company?.name ?? "APEX DYNAMICS";
  const ceoName = tabletData?.player_name ?? "Executive CEO";
  const sector = tabletData?.sector ?? session?.company?.sector ?? "Corporate Sector";
  const sessionStatus = tabletData?.session_status ?? "active";

  const state = tabletData?.state;
  const prevState = tabletData?.previous_state;
  const locks = tabletData?.locks;
  const recentEvents = tabletData?.recent_events ?? [];

  // Accumulate in-quarter decision deltas for live KPI badges (Hook called unconditionally)
  const quarterDeltas = useMemo(() => {
    const deltas: Record<string, number> = {};
    const events = tabletData?.recent_events ?? [];
    for (const ev of events) {
      if (ev.quarter === currentQ && ev.stat_deltas) {
        for (const [k, v] of Object.entries(ev.stat_deltas)) {
          const num = typeof v === "number" ? v : parseFloat(v as string);
          if (!isNaN(num)) {
            deltas[k] = (deltas[k] ?? 0) + num;
          }
        }
      }
    }
    return deltas;
  }, [tabletData?.recent_events, currentQ]);

  // KPI Trends Calculation (reflects active quarter decision deltas or inter-quarter comparison)
  const computeTrend = (metricKey: string, currentVal: number | undefined, prevVal: number | undefined, isCurrency = false) => {
    // 1. If we have active in-quarter decision deltas, show them!
    const activeDelta = quarterDeltas[metricKey];
    if (activeDelta !== undefined && Math.abs(activeDelta) >= 0.01) {
      const formatted = isCurrency
        ? (activeDelta > 0 ? `+₹${Math.round(activeDelta).toLocaleString()}` : `-₹${Math.abs(Math.round(activeDelta)).toLocaleString()}`)
        : (activeDelta > 0 ? `+${activeDelta.toFixed(1)}` : `${activeDelta.toFixed(1)}`);
      return {
        direction: activeDelta > 0 ? ("up" as const) : ("down" as const),
        text: formatted,
        title: `Q0${currentQ} Net Drift: ${formatted} (cumulative sum across all completed departments this quarter. See INTEL tab for individual event records).`,
      };
    }

    // 2. Otherwise fall back to inter-quarter comparison (quarter > 1)
    if (currentVal === undefined || prevVal === undefined || currentQ <= 1) {
      return null;
    }
    const diff = currentVal - prevVal;
    if (Math.abs(diff) < 0.01) return { direction: "neutral" as const, text: "STABLE", title: "Quarter-over-quarter change: Stable" };
    const diffText = isCurrency
      ? (diff > 0 ? `+₹${Math.round(diff).toLocaleString()}` : `-₹${Math.abs(Math.round(diff)).toLocaleString()}`)
      : (diff > 0 ? `+${diff.toFixed(1)}` : `${diff.toFixed(1)}`);
    return {
      direction: diff > 0 ? ("up" as const) : ("down" as const),
      text: diffText,
      title: `Quarter-over-quarter delta vs Q0${currentQ - 1}: ${diffText}`,
    };
  };

  // If on login/auth screens or no active session, do not render tablet launcher
  if (isAuthRoute || isSessionLoading || !session) {
    return null;
  }

  return (
    <>
      {/* 1. Floating Circular Launcher */}
      <aside aria-label="CEO Holographic Tablet Assistant" className="holographic-tablet-launcher-container">
        <button
          type="button"
          aria-label={isOpen ? "Close Corporate Tablet" : "Open Holographic Corporate Tablet"}
          aria-expanded={isOpen}
          onClick={handleToggle}
          className={`holographic-tablet-launcher ${isOpen ? "active" : ""}`}
          title="CORPORATE TABLET // LIVE HUD"
        >
          <div className="tablet-launcher-glow-ring" aria-hidden="true" />
          <div className="tablet-launcher-inner">
            <Tablet size={22} className="tablet-icon" />
          </div>
          <span className="tablet-tooltip" role="tooltip">
            CORPORATE TABLET
          </span>
        </button>
      </aside>

      {/* 2. Holographic Overlay Modal */}
      {isOpen && (
        <div
          className="holographic-tablet-backdrop"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-label="CEO Holographic Tablet Interface"
        >
          <div
            ref={tabletRef}
            className="holographic-tablet-frame animate-tablet-unfold"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Tablet Hardware Top Header */}
            <div className="tablet-device-header">
              <div className="tablet-device-lens" />
              <div className="tablet-header-title">
                <span className="tablet-badge">EXEC-OS v24.4</span>
                <strong>NEW KALKI EXECUTIVE INTERFACE</strong>
              </div>
              <button
                type="button"
                className="tablet-close-btn"
                onClick={() => {
                  soundManager.playClick();
                  setIsOpen(false);
                }}
                aria-label="Close tablet"
              >
                <X size={16} />
              </button>
            </div>

            {/* Quick Status Pill Bar */}
            <div className="tablet-quick-bar">
              <div className="quick-item">
                <small>FISCAL QUARTER</small>
                <span>Q0{currentQ}</span>
              </div>
              <div className="quick-item">
                <small>TREASURY CASH</small>
                <span className="cash-val">₹{state?.cash ? Number(state.cash).toLocaleString() : (session.company?.cash ? Number(session.company.cash).toLocaleString() : "0")}</span>
              </div>
              <div className="quick-item">
                <small>CONDITION</small>
                <span className={`status-val ${sessionStatus}`}>
                  {sessionStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Tablet Navigation Tabs */}
            <nav className="tablet-nav-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "status"}
                className={`tablet-tab ${activeTab === "status" ? "active" : ""}`}
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab("status");
                }}
              >
                STATUS
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "kpis"}
                className={`tablet-tab ${activeTab === "kpis" ? "active" : ""}`}
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab("kpis");
                }}
              >
                LIVE KPIS
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "activities"}
                className={`tablet-tab ${activeTab === "activities" ? "active" : ""}`}
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab("activities");
                }}
              >
                TRACKER
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "events"}
                className={`tablet-tab ${activeTab === "events" ? "active" : ""}`}
                onClick={() => {
                  soundManager.playClick();
                  setActiveTab("events");
                }}
              >
                INTEL
              </button>
            </nav>

            {/* Tablet Screen Body */}
            <div className="tablet-screen-body">
              {isTabletLoading && (
                <div className="tablet-loader">
                  <div className="tablet-loader-spinner" />
                  <span>SYNCING ENCRYPTED TELEMETRY...</span>
                </div>
              )}

              {!isTabletLoading && activeTab === "status" && (
                <div className="tablet-tab-content">
                  <div className="tablet-card-cluster">
                    <span className="cluster-tag">IDENTITY &amp; CHARTER</span>
                    <h3 className="cluster-title">{companyName}</h3>
                    <p className="cluster-subline">{sector} • Led by {ceoName}</p>
                    {session.company?.unique_strength && (
                      <div className="cluster-detail-pill">
                        <strong>Strength:</strong> {session.company.unique_strength}
                      </div>
                    )}
                    {session.company?.unique_passive_ability && (
                      <div className="cluster-detail-pill">
                        <strong>Protocol:</strong> {session.company.unique_passive_ability}
                      </div>
                    )}
                  </div>

                  <div className="tablet-card-cluster">
                    <span className="cluster-tag">EXECUTIVE METRICS SNAPSHOT</span>
                    <div className="status-grid">
                      <div className="status-metric">
                        <small>BOARD CONFIDENCE</small>
                        <strong style={{ color: (state?.board_confidence ?? 50) < 40 ? "#ef4444" : "#f59e0b" }}>
                          {state?.board_confidence ? Number(state.board_confidence).toFixed(1) : "50.0"}%
                        </strong>
                      </div>
                      <div className="status-metric">
                        <small>REVENUE YTD</small>
                        <strong className="text-white">
                          ₹{state?.revenue ? Number(state.revenue).toLocaleString() : "0"}
                        </strong>
                      </div>
                      <div className="status-metric">
                        <small>STOCK PRICE</small>
                        <strong className="text-white">
                          ₹{state?.stock_price ? Number(state.stock_price).toFixed(2) : "25.00"}
                        </strong>
                      </div>
                      <div className="status-metric">
                        <small>WORKFORCE</small>
                        <strong className="text-white">
                          {state?.employees ?? session.company?.employees ?? 50} Staff
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isTabletLoading && activeTab === "kpis" && (
                <div className="tablet-tab-content">
                  <div className="flex items-center justify-between px-1 mb-2.5 text-[10px] font-mono border-b border-neutral-800/80 pb-1.5">
                    <span className="text-amber-400 font-bold tracking-wider">LIVE TELEMETRY</span>
                    <span className="text-neutral-400">TREND BADGES: Q0{currentQ} NET SHIFT</span>
                  </div>
                  <div className="kpi-grid">
                    {[
                      { key: "cash", label: "LIQUID CASH", val: `₹${Number(state?.cash ?? 0).toLocaleString()}`, trend: computeTrend("cash", state?.cash, prevState?.cash, true) },
                      { key: "revenue", label: "REVENUE", val: `₹${Number(state?.revenue ?? 0).toLocaleString()}`, trend: computeTrend("revenue", state?.revenue, prevState?.revenue) },
                      { key: "debt", label: "DEBT OUTSTANDING", val: `₹${Number(state?.debt ?? 0).toLocaleString()}`, trend: computeTrend("debt", state?.debt, prevState?.debt, true) },
                      { key: "brand", label: "BRAND REPUTATION", val: `${Number(state?.brand ?? 50).toFixed(1)}/100`, trend: computeTrend("brand", state?.brand, prevState?.brand) },
                      { key: "investor_confidence", label: "INVESTOR CONFIDENCE", val: `${Number(state?.investor_confidence ?? 50).toFixed(1)}%`, trend: computeTrend("investor_confidence", state?.investor_confidence, prevState?.investor_confidence) },
                      { key: "board_confidence", label: "BOARD CONFIDENCE", val: `${Number(state?.board_confidence ?? 50).toFixed(1)}%`, trend: computeTrend("board_confidence", state?.board_confidence, prevState?.board_confidence) },
                      { key: "client_satisfaction", label: "CLIENT TRUST", val: `${Number(state?.client_satisfaction ?? 50).toFixed(1)}%`, trend: computeTrend("client_satisfaction", state?.client_satisfaction, prevState?.client_satisfaction) },
                      { key: "market_share", label: "MARKET SHARE", val: `${Number(state?.market_share ?? 5).toFixed(1)}%`, trend: computeTrend("market_share", state?.market_share, prevState?.market_share) },
                      { key: "risk", label: "RISK PROFILE", val: `${Number(state?.risk ?? 20).toFixed(1)}%`, trend: computeTrend("risk", state?.risk, prevState?.risk) },
                      { key: "innovation", label: "INNOVATION RATING", val: `${Number(state?.innovation ?? 50).toFixed(1)}/100`, trend: computeTrend("innovation", state?.innovation, prevState?.innovation) },
                      { key: "esg", label: "ESG INTEGRITY", val: `${Number(state?.esg ?? 50).toFixed(1)}/100`, trend: computeTrend("esg", state?.esg, prevState?.esg) },
                      { key: "employee_satisfaction", label: "EMPLOYEE MORALE", val: `${Number(state?.employee_satisfaction ?? 50).toFixed(1)}%`, trend: computeTrend("employee_satisfaction", state?.employee_satisfaction, prevState?.employee_satisfaction) },
                    ].map((kpi, idx) => (
                      <div key={idx} className="kpi-card">
                        <div className="kpi-header">
                          <span>{kpi.label}</span>
                          {kpi.trend && (
                            <span
                              className={`kpi-trend ${kpi.trend.direction}`}
                              title={kpi.trend.title}
                            >
                              {kpi.trend.direction === "up" && <TrendingUp size={11} />}
                              {kpi.trend.direction === "down" && <TrendingDown size={11} />}
                              {kpi.trend.direction === "neutral" && <Minus size={11} />}
                              {kpi.trend.text}
                            </span>
                          )}
                        </div>
                        <div className="kpi-value">{kpi.val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isTabletLoading && activeTab === "activities" && (
                <div className="tablet-tab-content">
                  <div className="activity-list">
                    {[
                      {
                        name: "FINANCE & OPERATIONS",
                        desc: "Resource allocation & budget commitment",
                        status: locks?.operations?.locked ? "DONE" : "TO DO",
                        detail: locks?.operations?.summary,
                      },
                      {
                        name: "MARKETING & CAMPAIGNS",
                        desc: "Strategic intelligence & market position",
                        status: locks?.market?.locked ? "DONE" : "TO DO",
                        detail: locks?.market?.summary,
                      },
                      {
                        name: "RESEARCH & DEVELOPMENT",
                        desc: "Project Helix tech directive",
                        status: locks?.rd?.locked ? "DONE" : "TO DO",
                        detail: locks?.rd?.summary,
                      },
                      {
                        name: "CLIENT WORLD",
                        desc: currentQ <= 2 ? "B2B commercial negotiation" : "Enterprise client agreements",
                        status: currentQ > 2 ? "PASSIVE" : (locks?.client?.locked ? "DONE" : (locks?.operations?.locked && locks?.market?.locked && locks?.rd?.locked ? "TO DO" : "LOCKED")),
                        detail: currentQ > 2 ? "Passive contract monitoring" : locks?.client?.summary,
                      },
                      {
                        name: "PRESS WORLD",
                        desc: currentQ <= 2 ? "New Kalki broadcast conference" : "Corporate Times passive coverage",
                        status: currentQ > 2 ? "PASSIVE" : (locks?.press?.locked ? "DONE" : (locks?.operations?.locked && locks?.market?.locked && locks?.rd?.locked ? "TO DO" : "LOCKED")),
                        detail: currentQ > 2 ? "Passive editorial evaluation" : locks?.press?.summary,
                      },
                      {
                        name: "BOARD OF DIRECTORS",
                        desc: "Strategic inquiry & executive survival",
                        status: (
                          currentQ <= 2
                            ? (locks?.operations?.locked && locks?.market?.locked && locks?.rd?.locked && locks?.client?.locked && locks?.press?.locked)
                            : (locks?.operations?.locked && locks?.market?.locked && locks?.rd?.locked)
                        )
                          ? "READY"
                          : "LOCKED",
                        detail: (
                          currentQ <= 2
                            ? (locks?.operations?.locked && locks?.market?.locked && locks?.rd?.locked && locks?.client?.locked && locks?.press?.locked)
                            : (locks?.operations?.locked && locks?.market?.locked && locks?.rd?.locked)
                        )
                          ? "Quorum ready to convene"
                          : "Awaiting quarterly operational milestones",
                      },
                    ].map((act, i) => (
                      <div key={i} className={`activity-row ${act.status.toLowerCase()}`}>
                        <div className="activity-icon-col">
                          {act.status === "DONE" && <CheckCircle2 size={16} className="text-emerald-400" />}
                          {act.status === "PASSIVE" && <Radio size={16} className="text-amber-400" />}
                          {act.status === "TO DO" && <Activity size={16} className="text-cyan-400 animate-pulse" />}
                          {act.status === "READY" && <Award size={16} className="text-amber-400 animate-pulse" />}
                          {act.status === "LOCKED" && <Lock size={16} className="text-neutral-500" />}
                        </div>
                        <div className="activity-info-col">
                          <strong>{act.name}</strong>
                          <p>{act.desc}</p>
                          {act.detail && <span className="activity-detail">{act.detail}</span>}
                        </div>
                        <span className={`activity-status-badge ${act.status.toLowerCase()}`}>
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!isTabletLoading && activeTab === "events" && (
                <div className="tablet-tab-content">
                  {recentEvents.length === 0 ? (
                    <div className="tablet-empty-notice">
                      <FileText size={24} className="text-neutral-500 mb-2" />
                      <span>NO EXECUTIVE DECISIONS RECORDED YET</span>
                      <small>Commit department operations or client deals to view history logs.</small>
                    </div>
                  ) : (
                    <div className="events-timeline">
                      {recentEvents.map((ev, idx) => (
                        <div key={idx} className="timeline-item">
                          <div className="timeline-marker" />
                          <div className="timeline-body">
                            <div className="timeline-header">
                              <span className="timeline-quarter">Q0{ev.quarter}</span>
                              <span className="timeline-type">{ev.decision_type.toUpperCase()}</span>
                            </div>
                            <p className="timeline-summary">{ev.summary}</p>
                            {ev.stat_deltas && Object.keys(ev.stat_deltas).length > 0 && (
                              <div className="timeline-deltas">
                                {Object.entries(ev.stat_deltas).map(([k, v]) => {
                                  const num = typeof v === "number" ? v : parseFloat(v as string);
                                  if (isNaN(num)) return null;
                                  const isCash = k.toLowerCase().includes("cash") || k.toLowerCase().includes("debt");
                                  const formatted = isCash
                                    ? (num >= 0 ? `+₹${Math.round(num).toLocaleString()}` : `-₹${Math.abs(Math.round(num)).toLocaleString()}`)
                                    : (Math.abs(num) >= 50
                                      ? `${num >= 0 ? "+" : ""}${Math.round(num)}`
                                      : `${num >= 0 ? "+" : ""}${num.toFixed(1)}`);
                                  return (
                                    <span key={k} className={`delta-tag ${num >= 0 ? "pos" : "neg"}`}>
                                      {k.replace(/_/g, " ")}: {formatted}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Tablet Footer Status Bar */}
            <div className="tablet-device-footer">
              <span className="footer-status-dot" />
              <span>TERMINAL CONNECTED // SECURE ENCLAVE</span>
              <span className="footer-time">{new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
