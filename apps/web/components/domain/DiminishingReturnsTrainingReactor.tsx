"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { type RegisterResponse } from "@/lib/api/registration";
import { soundManager } from "@/lib/audio";
import {
  TRAINING_ROUNDS,
  TrainingSector,
  TrainingRoundConfig,
  UNIT_VALUE,
  PASS_THRESHOLD,
  sectorOutput,
  sectorMarginal,
  calculateRoundEfficiency,
} from "@/lib/training-reactor-data";

// -----------------------------------------------------------------------------
// Icon Helpers
// -----------------------------------------------------------------------------

function SvgIcon({
  name,
  size = 18,
}: {
  name: "arrow" | "building" | "check" | "chevron" | "flask" | "lock" | "marketing" | "pulse" | "warning";
  size?: number;
}) {
  const paths: Record<string, ReactNode> = {
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    building: (
      <>
        <path d="M5 21V7l7-4 7 4v14M3 21h18" />
        <path d="M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    flask: (
      <>
        <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
        <path d="M8 15h8" />
      </>
    ),
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" />
      </>
    ),
    marketing: (
      <>
        <path d="M4 19V9M10 19V5M16 19v-8M22 19V2" />
        <path d="m3 13 6-6 6 4 7-8" />
      </>
    ),
    pulse: <path d="M3 12h4l2-7 4 14 2-7h6" />,
    warning: (
      <>
        <path d="M12 3 2.8 20h18.4L12 3Z" />
        <path d="M12 9v5M12 17h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

// -----------------------------------------------------------------------------
// Component Props
// -----------------------------------------------------------------------------

interface DiminishingReturnsTrainingReactorProps {
  data?: RegisterResponse;
  onBack?: () => void;
  onComplete: () => void;
}

export function DiminishingReturnsTrainingReactor({
  data,
  onBack,
  onComplete,
}: DiminishingReturnsTrainingReactorProps) {
  // Navigation / Phase states
  const [roundIdx, setRoundIdx] = useState(0); // 0, 1, 2
  const [phase, setPhase] = useState<"briefing" | "allocating" | "assessment" | "final_cleared">("briefing");

  const currentRound = TRAINING_ROUNDS[roundIdx];
  const sectorCount = currentRound.sectors.length;

  // Active round state
  const [allocations, setAllocations] = useState<number[]>(() => new Array(sectorCount).fill(0));
  const [selectedSectorIdx, setSelectedSectorIdx] = useState<number>(0);
  const [seconds, setSeconds] = useState(currentRound.seconds);
  const [reaction, setReaction] = useState({
    department: "SYSTEM",
    before: 0,
    after: 0,
    direction: "REACTOR CALIBRATED",
  });

  // Reset or initialize round
  const initRound = useCallback((idx: number) => {
    setRoundIdx(idx);
    const roundConfig = TRAINING_ROUNDS[idx];
    setAllocations(new Array(roundConfig.sectors.length).fill(0));
    setSelectedSectorIdx(0);
    setSeconds(roundConfig.seconds);
    setReaction({
      department: "SYSTEM",
      before: 0,
      after: 0,
      direction: "REACTOR CALIBRATED",
    });
    setPhase("allocating");
  }, []);

  // Global Escape Key Listener for return navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && onBack) {
        onBack();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  // Sync allocations when roundIdx changes
  useEffect(() => {
    setAllocations(new Array(currentRound.sectors.length).fill(0));
    setSelectedSectorIdx(0);
    setSeconds(currentRound.seconds);
  }, [roundIdx, currentRound]);

  // Derived unit balances
  const totalAllocated = useMemo(() => allocations.reduce((sum, v) => sum + v, 0), [allocations]);
  const remaining = currentRound.units - totalAllocated;

  // Timer Countdown in "allocating" phase
  useEffect(() => {
    if (phase !== "allocating") return;
    if (seconds <= 0) {
      soundManager.playAlert();
      setPhase("assessment");
      return;
    }
    const timer = setInterval(() => {
      setSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, seconds]);

  const timerState = seconds <= 5 ? "critical" : seconds <= 10 ? "warning" : "stable";

  // Unit manipulation
  const changeUnit = (index: number, delta: number) => {
    if (phase !== "allocating") return;
    const current = allocations[index] || 0;
    if (delta > 0 && remaining <= 0) return;
    if (delta < 0 && current <= 0) return;

    soundManager.playClick();
    setSelectedSectorIdx(index);

    const sector = currentRound.sectors[index];
    const beforeMarginal = sectorMarginal(sector, current);
    const nextUnits = current + delta;
    const afterMarginal = sectorMarginal(sector, nextUnits);

    setAllocations((prev) => {
      const copy = [...prev];
      copy[index] = nextUnits;
      return copy;
    });

    setReaction({
      department: sector.name,
      before: beforeMarginal,
      after: afterMarginal,
      direction:
        delta > 0
          ? afterMarginal < 4
            ? "STEEP DIMINISHING ZONE"
            : afterMarginal < 8
            ? "APPROACHING SATURATION"
            : "OPTIMAL RETURN ZONE"
          : "CAPITAL UNIT RECALLED",
    });
  };

  // Lock In & Assess (Only calculated when locked or timer expires)
  const handleLockIn = () => {
    soundManager.playSuccess();
    setPhase("assessment");
  };

  // Assessment score (calculated ONLY on assessment screen)
  const assessedEfficiency = useMemo(() => {
    if (phase !== "assessment" && phase !== "final_cleared") return 0;
    return calculateRoundEfficiency(currentRound, allocations);
  }, [phase, currentRound, allocations]);

  const roundPassed = assessedEfficiency >= PASS_THRESHOLD;

  // Next round or completion
  const handleNextRound = () => {
    soundManager.playSuccess();
    if (roundIdx < TRAINING_ROUNDS.length - 1) {
      initRound(roundIdx + 1);
    } else {
      setPhase("final_cleared");
    }
  };

  // ===========================================================================
  // SCREEN 1: COO ELENA ROSTOVA BRIEFING (First view before Round 1 starts)
  // ===========================================================================
  if (phase === "briefing") {
    return (
      <main className="screen department-screen finance">
        <header className="system-bar">
          <div className="system-brand">
            <BrandMark />
            <span>{data?.company?.name ? data.company.name.toUpperCase() : "APEX DYNAMICS"}</span>
          </div>
          <div className="location-readout">
            <i />
            <span>OPERATIONS // TRAINING SIMULATION</span>
          </div>
          <div className="system-stats">
            <span>UNITS</span>
            <strong>₹25,000 / BLOCK</strong>
            {onBack && (
              <button className="key-control" onClick={onBack} type="button">
                <kbd>ESC</kbd> RETURN
              </button>
            )}
          </div>
        </header>

        <div className="department-environment" />

        <div className="department-content">
          <section className="briefing-modal">
            <div className="briefing-speaker">
              <div className="briefing-avatar">COO</div>
              <div>
                <strong>ELENA ROSTOVA</strong>
                <span>CHIEF OPERATING OFFICER // CORPORATE ADVISOR</span>
              </div>
            </div>

            <p className="briefing-text">
              “Welcome to the Operations Grid, CEO. Before you manage real corporate capital,
              you must prove you understand the <strong>Principle of Diminishing Marginal Returns</strong>.
              Every ₹25,000 unit allocated here influences our trajectory. Be wary of over-investing in a
              single sector—each subsequent dollar yields shrinking output while starving other critical infrastructure.”
            </p>

            <div className="briefing-card-grid">
              <div className="briefing-card">
                <strong>01. THREE SCALING ROUNDS</strong>
                <p>
                  Progress from 3 sectors (Round 1) up to 10 competing branches (Round 3) under strict time pressure.
                </p>
              </div>
              <div className="briefing-card">
                <strong>02. MULTI-CURVE REACTOR</strong>
                <p>
                  Every sector has its own curve. Fast saturators cap early; slow-burn sectors reward sustained funding.
                </p>
              </div>
              <div className="briefing-card">
                <strong>03. ≥75% EFFICIENCY GATE</strong>
                <p>
                  No live efficiency meters during allocation. Trust marginal yields to unlock executive access.
                </p>
              </div>
            </div>

            <button
              className="game-button cyan"
              onClick={() => {
                soundManager.playSuccess();
                initRound(0);
              }}
              type="button"
            >
              <span>[ INITIALIZE TRAINING REACTOR — ROUND 01 ]</span>
              <SvgIcon name="arrow" size={18} />
            </button>
          </section>
        </div>
      </main>
    );
  }

  // ===========================================================================
  // SCREEN 2: FINAL COMPLETION SCREEN (After clearing Round 3)
  // ===========================================================================
  if (phase === "final_cleared") {
    return (
      <main className="screen department-screen finance finance-assessment">
        <header className="system-bar">
          <div className="system-brand">
            <BrandMark />
            <span>APEX DYNAMICS</span>
          </div>
          <div className="location-readout">
            <i />
            <span>FINANCE &amp; OPERATIONS // PROTOCOL RATIFIED</span>
          </div>
          <div className="system-stats">
            <span>EXECUTIVE ACCESS</span>
            <strong style={{ color: "var(--cyan)" }}>UNLOCKED</strong>
          </div>
        </header>

        <div className="department-environment" />

        <div className="department-content">
          <section className="assessment-screen">
            <div className="assessment-sigil passed">
              <SvgIcon name="check" size={32} />
            </div>
            <span>DIMINISHING RETURNS PROTOCOL</span>
            <h1>
              ALL 3 ROUNDS CLEARED
              <br />
              EXECUTIVE ACCESS UNLOCKED
            </h1>

            <div className="assessment-ledger" style={{ maxWidth: 540, margin: "0 auto 24px" }}>
              <div style={{ padding: "18px 24px" }}>
                <small>TRAINING PROGRESSION</small>
                <p><span>ROUND 01 (3 SECTORS)</span><strong style={{ color: "var(--cyan)" }}>PASSED ✓</strong></p>
                <p><span>ROUND 02 (6 SECTORS)</span><strong style={{ color: "var(--cyan)" }}>PASSED ✓</strong></p>
                <p><span>ROUND 03 (10 SECTORS)</span><strong style={{ color: "var(--cyan)" }}>PASSED ✓</strong></p>
              </div>
              <div style={{ padding: "18px 24px" }}>
                <small>PORTFOLIO DISCIPLINE</small>
                <strong style={{ fontSize: 26, color: "var(--gold-bright)" }}>100%</strong>
                <p>EQUIMARGINAL CRITERIA: <b>SATISFIED</b></p>
                <span style={{ color: "var(--cyan)" }}>READY FOR LIVE CAPITAL DEPLOYMENT</span>
              </div>
            </div>

            <div className="access-verdict passed" style={{ maxWidth: 540, margin: "0 auto" }}>
              EXECUTIVE FINANCIAL CONTROLS AUTHORIZED
            </div>

            <div className="assessment-actions" style={{ maxWidth: 540 }}>
              <button
                className="game-button cyan"
                onClick={onComplete}
                type="button"
              >
                <span>ENTER FINANCE &amp; OPERATIONS →</span>
                <SvgIcon name="arrow" size={18} />
              </button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ===========================================================================
  // SCREEN 3: ROUND ASSESSMENT SCREEN (Reveals score and tests ≥ 75%)
  // ===========================================================================
  if (phase === "assessment") {
    return (
      <main className="screen department-screen finance finance-assessment">
        <header className="system-bar">
          <div className="system-brand">
            <BrandMark />
            <span>APEX DYNAMICS</span>
          </div>
          <div className={`location-readout ${roundPassed ? "" : "is-danger"}`}>
            <i />
            <span>ROUND 0{currentRound.roundNumber} // EVALUATION LEDGER</span>
          </div>
          <div className="system-stats">
            <span>THRESHOLD</span>
            <strong>75% REQUIRED</strong>
          </div>
        </header>

        <div className="department-environment" />

        <div className="department-content">
          <section className="assessment-screen">
            <div className={`assessment-sigil ${roundPassed ? "passed" : "failed"}`}>
              <SvgIcon name={roundPassed ? "check" : "warning"} size={30} />
            </div>

            <span>ROUND 0{currentRound.roundNumber} // ASSESSMENT</span>
            <h1>
              {roundPassed ? (
                <>
                  ROUND CLEARED
                  <br />
                  REACTOR PROTOCOL ACCEPTED
                </>
              ) : (
                <>
                  ROUND FAILED
                  <br />
                  ALLOCATION BELOW THRESHOLD
                </>
              )}
            </h1>

            <div className="assessment-ledger">
              <div className="final-allocation">
                <small>FINAL ALLOCATION ({totalAllocated} / {currentRound.units} UNITS)</small>
                {currentRound.sectors.map((sector, index) => (
                  <p key={sector.id}>
                    <span>{sector.name}</span>
                    <strong>{allocations[index] || 0} UNITS (₹{((allocations[index] || 0) * UNIT_VALUE).toLocaleString()})</strong>
                  </p>
                ))}
              </div>

              <div className="final-efficiency">
                <small>PORTFOLIO EFFICIENCY</small>
                <strong>{assessedEfficiency}%</strong>
                <p>
                  EXECUTIVE THRESHOLD <b>{PASS_THRESHOLD}%</b>
                </p>
                <div>
                  <i style={{ width: `${Math.min(100, assessedEfficiency)}%` }} />
                </div>
                <span>
                  {roundPassed
                    ? `CONFIRMED (+${assessedEfficiency - PASS_THRESHOLD}% ABOVE BENCHMARK)`
                    : `DEFICIT (-${PASS_THRESHOLD - assessedEfficiency}% BELOW BENCHMARK)`}
                </span>
              </div>
            </div>

            <div className={`access-verdict ${roundPassed ? "passed" : "failed"}`}>
              {roundPassed
                ? roundIdx < TRAINING_ROUNDS.length - 1
                  ? `ADVANCEMENT CLEARANCE GRANTED FOR ROUND 0${roundIdx + 2}`
                  : "FINAL CLEARANCE GRANTED // EXECUTIVE ACCESS UNLOCKED"
                : "CAPITAL MODEL REJECTED // EQUIMARGINAL SPREAD NOT ACHIEVED"}
            </div>

            <div className="assessment-actions">
              <button
                className="game-button ghost"
                onClick={() => initRound(roundIdx)}
                type="button"
              >
                <span>RETRY ROUND 0{currentRound.roundNumber}</span>
              </button>

              {roundPassed && (
                <button
                  className="game-button cyan"
                  onClick={handleNextRound}
                  type="button"
                >
                  <span>
                    {roundIdx < TRAINING_ROUNDS.length - 1
                      ? `PROCEED TO ROUND 0${roundIdx + 2} →`
                      : "FINALIZE TRAINING →"}
                  </span>
                  <SvgIcon name="arrow" size={18} />
                </button>
              )}
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ===========================================================================
  // SCREEN 4: LIVE ALLOCATION REACTOR (MULTI-CURVE GRAPH + HUD)
  // ===========================================================================
  const activeSector = currentRound.sectors[selectedSectorIdx] || currentRound.sectors[0];
  const activeUnits = allocations[selectedSectorIdx] || 0;
  const activeNextYield = sectorMarginal(activeSector, activeUnits);

  // Compute node coordinates on active sector curve for SVG graph
  const maxRoundUnits = currentRound.units;
  const graphW = 720;
  const graphH = 210;
  const graphStartX = 45;
  const graphStartY = 230;

  // Active sector node X and Y
  const nodeX = graphStartX + (activeUnits / maxRoundUnits) * graphW;
  const activeOut = sectorOutput(activeSector, activeUnits);
  const activeMaxOut = activeSector.maxOutput;
  const nodeY = graphStartY - (activeOut / activeMaxOut) * graphH;

  return (
    <main className="screen department-screen finance finance-reactor">
      {/* Top HUD */}
      <section className="reactor-hud">
        <div className="reactor-identity">
          <SvgIcon name="building" size={24} />
          <div>
            <strong>EXECUTIVE FINANCIAL SIMULATION</strong>
            <span>{currentRound.title}</span>
          </div>
          <small>TRAINING PROTOCOL ACTIVE</small>
          {onBack && (
            <button
              className="key-control"
              onClick={onBack}
              type="button"
              style={{ marginLeft: 16 }}
            >
              <kbd>ESC</kbd> BACK TO HQ
            </button>
          )}
        </div>

        {/* Live Timer Ring */}
        <div className={`reactor-timer ${timerState}`}>
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="35" />
            <circle
              cx="40"
              cy="40"
              r="35"
              style={{
                strokeDashoffset: 220 - (seconds / currentRound.seconds) * 220,
              }}
            />
          </svg>
          <strong>00:{String(seconds).padStart(2, "0")}</strong>
          <span>{seconds === 0 ? "EXPIRED" : "REMAINING"}</span>
        </div>

        {/* Capital Pool Tracker */}
        <div className="capital-pool">
          <div>
            <span>CAPITAL POOL</span>
            <small>₹25,000 / UNIT</small>
          </div>
          <strong>
            {remaining} <i>/ {currentRound.units} UNITS</i>
          </strong>
          <div className="capital-blocks">
            {Array.from({ length: currentRound.units }, (_, index) => (
              <i className={index < remaining ? "available" : ""} key={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Main Reactor Workspace */}
      <div className="reactor-workspace">
        {/* Central Multi-Curve Reactor */}
        <section className="economic-reactor">
          <header>
            <div>
              <SvgIcon name="pulse" size={16} />
              <strong>MULTI-SECTOR MARGINAL RETURN REACTOR</strong>
            </div>
            <span>
              ACTIVE FOCUS: <b style={{ color: activeSector.color }}>{activeSector.name}</b>
            </span>
          </header>

          <div className="reactor-graph">
            <span className="graph-y">OUTPUT YIELD ↑</span>

            <svg viewBox="0 0 780 270" role="img" aria-label="Multi-sector diminishing returns reactor curves">
              <defs>
                <linearGradient id="activeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={activeSector.color} stopOpacity="0.18" />
                  <stop offset="1" stopColor={activeSector.color} stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Render curves for ALL sectors simultaneously */}
              {currentRound.sectors.map((sector, idx) => {
                const isSelected = idx === selectedSectorIdx;
                const pathPoints: string[] = [];
                const steps = 24;

                for (let s = 0; s <= steps; s++) {
                  const u = (s / steps) * maxRoundUnits;
                  const out = sectorOutput(sector, u);
                  const x = graphStartX + (u / maxRoundUnits) * graphW;
                  const y = graphStartY - (out / sector.maxOutput) * graphH;
                  pathPoints.push(`${s === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
                }

                const pathData = pathPoints.join(" ");

                return (
                  <g key={sector.id}>
                    {/* Active area fill */}
                    {isSelected && (
                      <path
                        d={`${pathData} L ${graphStartX + graphW} ${graphStartY} L ${graphStartX} ${graphStartY} Z`}
                        fill="url(#activeAreaGrad)"
                      />
                    )}
                    {/* Curve line */}
                    <path
                      d={pathData}
                      fill="none"
                      stroke={sector.color}
                      strokeWidth={isSelected ? 3.5 : 1.2}
                      strokeOpacity={isSelected ? 1 : 0.28}
                      style={{
                        filter: isSelected ? `drop-shadow(0 0 6px ${sector.color})` : "none",
                        transition: "all 300ms ease",
                      }}
                    />
                  </g>
                );
              })}

              {/* Optimum Reference Line */}
              <line
                x1={graphStartX + graphW * 0.52}
                y1={graphStartY - graphH}
                x2={graphStartX + graphW * 0.52}
                y2={graphStartY}
                stroke="rgba(217,188,122,0.3)"
                strokeDasharray="4 4"
              />

              {/* Current Active Node on Curve */}
              <circle
                className="reactor-node"
                cx={nodeX}
                cy={nodeY}
                r="8"
                style={{
                  fill: "#ffffff",
                  stroke: activeSector.color,
                  filter: `drop-shadow(0 0 8px ${activeSector.color})`,
                }}
              />
              <circle
                className="reactor-node-ring"
                cx={nodeX}
                cy={nodeY}
                r="16"
                style={{ stroke: activeSector.color }}
              />
            </svg>

            <div className="optimal-label">
              OPTIMAL OPERATING ZONE <i />
            </div>
            <div className="diminishing-label">
              <i /> DECLINING MARGINAL YIELD
            </div>

            <div className="graph-x">
              {Array.from({ length: 6 }, (_, i) => {
                const u = Math.round((i / 5) * maxRoundUnits);
                return <span key={i}>₹{((u * UNIT_VALUE) / 1000).toFixed(0)}K</span>;
              })}
            </div>
            <span className="graph-axis-title">CAPITAL ALLOCATED →</span>
          </div>

          {/* Reactor Response Log */}
          <div className={`reactor-response ${reaction.after < 5 && reaction.after > 0 ? "diminishing" : ""}`}>
            <div>
              <span>LAST INPUT</span>
              <strong>
                {reaction.department === "SYSTEM"
                  ? "SYSTEM CALIBRATED"
                  : `+1 UNIT → ${reaction.department}`}
              </strong>
            </div>
            <div>
              <span>MARGINAL YIELD</span>
              <strong>
                {reaction.before ? `+${reaction.before.toFixed(1)} → +${reaction.after.toFixed(1)}` : "AWAITING INPUT"}
              </strong>
            </div>
            <div>
              <span>REACTOR RESPONSE</span>
              <strong>{reaction.direction}</strong>
            </div>
          </div>
        </section>

        {/* Scalable Department Sector Cards Grid */}
        <section
          className="department-reactors"
          style={{
            gridTemplateColumns:
              sectorCount <= 3
                ? "repeat(3, 1fr)"
                : sectorCount <= 6
                ? "repeat(6, 1fr)"
                : "repeat(5, 1fr)",
          }}
        >
          {currentRound.sectors.map((sector, idx) => {
            const units = allocations[idx] || 0;
            const currentOut = sectorOutput(sector, units);
            const nextYield = sectorMarginal(sector, units);
            const prevYield = units > 0 ? sectorMarginal(sector, units - 1) : null;
            const percentChange = prevYield ? Math.round(((nextYield - prevYield) / prevYield) * 100) : null;

            const outputPercent = Math.min(100, Math.round((currentOut / sector.maxOutput) * 100));
            const isDiminishing = nextYield < 5;
            const isModerating = nextYield < 9 && !isDiminishing;
            const state = isDiminishing ? "diminishing" : isModerating ? "moderating" : "healthy";
            const isSelected = idx === selectedSectorIdx;

            return (
              <article
                key={sector.id}
                className={`department-reactor ${state} ${isSelected ? "active-selected" : ""}`}
                onClick={() => setSelectedSectorIdx(idx)}
              >
                <header>
                  <span>0{idx + 1}</span>
                  <div>
                    <strong>{sector.name}</strong>
                    <small>{sector.system}</small>
                  </div>
                  <SvgIcon name={sector.iconType} size={16} />
                </header>

                <p>{sector.profile}</p>

                <div className="unit-control">
                  <span>UNITS</span>
                  <div>
                    <button
                      aria-label={`Remove unit from ${sector.name}`}
                      disabled={units === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        changeUnit(idx, -1);
                      }}
                      type="button"
                    >
                      −
                    </button>
                    <strong>
                      {String(units).padStart(2, "0")} <small>UNITS</small>
                      <b>₹{(units * UNIT_VALUE).toLocaleString()}</b>
                    </strong>
                    <button
                      aria-label={`Add unit to ${sector.name}`}
                      disabled={remaining === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        changeUnit(idx, 1);
                      }}
                      type="button"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="department-output">
                  <span>
                    OUTPUT <b>{outputPercent}%</b>
                  </span>
                  <i>
                    <b style={{ width: `${outputPercent}%`, backgroundColor: sector.color }} />
                  </i>
                </div>

                {/* Explicit Marginal Yield & Percentage Drop */}
                <div className="next-yield">
                  <span>NEXT UNIT</span>
                  <strong>
                    +{nextYield.toFixed(1)} <small>YIELD</small>
                  </strong>
                  <b>
                    {percentChange !== null ? `${percentChange}% vs PREVIOUS` : "INITIAL DOLLAR"}
                  </b>
                </div>
              </article>
            );
          })}
        </section>

        {/* Bottom Evaluation Tray (NO efficiency % visible during allocation) */}
        <section className="evaluation-tray">
          <div className="evaluation-tray-left">
            <strong>
              ROUND 0{currentRound.roundNumber} ALLOCATION ACTIVE ({totalAllocated} / {currentRound.units} UNITS COMMITTED)
            </strong>
            <span>
              DISCIPLINE: Analyze marginal yields across competing sectors. Efficiency evaluated upon lock-in.
            </span>
          </div>

          <div className="evaluation-actions">
            <button
              onClick={() => {
                soundManager.playClick();
                setAllocations(new Array(sectorCount).fill(0));
                setSelectedSectorIdx(0);
              }}
              type="button"
            >
              RESET ALLOCATIONS
            </button>

            <button
              className="game-button cyan"
              onClick={handleLockIn}
              type="button"
            >
              <span>LOCK ALLOCATION → ASSESS</span>
              <SvgIcon name="arrow" size={16} />
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
