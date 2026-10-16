"use client";

import { useState } from "react";
import { type RegisterResponse } from "@/lib/api/registration";
import { SystemBar } from "./FigmaCityMap";

function LockIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <rect x="5" y="10" width="14" height="11" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function WarningIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 9v5M12 17h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface FigmaHQMapProps {
  data: RegisterResponse;
  onBack: () => void;
  onEnterFinance: () => void;
  onEnterMarketing: () => void;
  onEnterResearch: () => void;
  onEnterBoard: () => void;
  boardUnlocked?: boolean;
  departmentLocks?: {
    operations?: { locked: boolean } | null;
    market?: { locked: boolean } | null;
    rd?: { locked: boolean } | null;
    client?: { locked: boolean } | null;
    press?: { locked: boolean } | null;
  };
}

export function FigmaHQMap({
  data,
  onBack,
  onEnterFinance,
  onEnterMarketing,
  onEnterResearch,
  onEnterBoard,
  boardUnlocked = false,
  departmentLocks,
}: FigmaHQMapProps) {
  const [lockedMessage, setLockedMessage] = useState(false);

  const isBankrupt =
    data.status === "bankrupt" ||
    (departmentLocks as any)?.session_status === "bankrupt" ||
    (data.company?.cash ?? 0) < 0;

  const opsLocked = isBankrupt || Boolean(departmentLocks?.operations?.locked);
  const marketLocked = isBankrupt || Boolean(departmentLocks?.market?.locked);
  const rdLocked = isBankrupt || Boolean(departmentLocks?.rd?.locked);

  const handleBoardClick = () => {
    if (isBankrupt) return;
    if (boardUnlocked) {
      onEnterBoard();
    } else {
      setLockedMessage(true);
      window.setTimeout(() => setLockedMessage(false), 3000);
    }
  };

  return (
    <main className="screen map-screen hq-screen">
      <SystemBar
        onBack={onBack}
        section="HEADQUARTERS // EXECUTIVE LEVEL"
        companyName={data.company?.name}
        capital={data.company?.cash}
      />
      <img
        className="world-map"
        src="/assets/hq-map.png"
        alt={`Interior of ${data.company?.name ?? "Apex Dynamics"} Headquarters`}
      />
      <div className="map-vignette" />
      <div className="map-intro">
        <span>{data.company?.name ? data.company.name.toUpperCase() : "APEX DYNAMICS"}</span>
        <strong>HEADQUARTERS</strong>
      </div>

      {/* 1. Finance & Operations Hotspot */}
      <button
        className={`map-hotspot hq-finance ${opsLocked ? "dept-locked" : ""}`}
        aria-label={opsLocked ? "Finance and Operations (Action Committed)" : "Enter Finance and Operations"}
        onClick={onEnterFinance}
        type="button"
      >
        <span>
          {opsLocked ? (
            <>
              <LockIcon size={14} /> FINANCE // DONE
            </>
          ) : (
            <>
              <kbd>E</kbd> FINANCE // TO DO
            </>
          )}
        </span>
      </button>

      {/* 2. Research & Development Hotspot */}
      <button
        className={`map-hotspot hq-research ${rdLocked ? "dept-locked" : ""}`}
        aria-label={rdLocked ? "Research and Development (Action Committed)" : "Enter Research and Development"}
        onClick={onEnterResearch}
        type="button"
      >
        <span>
          {rdLocked ? (
            <>
              <LockIcon size={14} /> R&amp;D // DONE
            </>
          ) : (
            <>
              <kbd>E</kbd> R&amp;D // TO DO
            </>
          )}
        </span>
      </button>

      {/* 3. Marketing & Acquisitions Hotspot */}
      <button
        className={`map-hotspot hq-marketing ${marketLocked ? "dept-locked" : ""}`}
        aria-label={marketLocked ? "Marketing and Acquisitions (Action Committed)" : "Enter Marketing and Acquisitions"}
        onClick={onEnterMarketing}
        type="button"
      >
        <span>
          {marketLocked ? (
            <>
              <LockIcon size={14} /> MARKETING // DONE
            </>
          ) : (
            <>
              <kbd>E</kbd> MARKETING // TO DO
            </>
          )}
        </span>
      </button>

      {/* 4. Board Conference Hotspot */}
      <button
        className={`map-hotspot hq-board ${boardUnlocked ? "unlocked" : "locked"}`}
        aria-label={boardUnlocked ? "Enter Board Conference" : "Board Conference locked"}
        onClick={handleBoardClick}
        type="button"
      >
        <span>
          {boardUnlocked ? <WarningIcon size={17} /> : <LockIcon size={17} />}
          {boardUnlocked ? "BOARD MEETING CALLED" : "ACCESS RESTRICTED"}
        </span>
      </button>

      {!boardUnlocked && (
        <div className={`lock-caption ${lockedMessage ? "active" : ""}`}>
          <LockIcon size={15} /> BOARD CONFERENCE <small>Available only under corporate threat</small>
        </div>
      )}

      <div className="map-hint">
        MOVE BETWEEN DEPARTMENTS <span>•</span> SELECT A LOCATION
      </div>

      {isBankrupt && (
        <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="max-w-xl w-full border-2 border-red-500 bg-neutral-950 p-8 flex flex-col gap-5 shadow-[0_0_50px_rgba(239,68,68,0.5)]">
            <div className="flex items-center gap-3 pb-3 border-b border-red-900/60">
              <div className="w-10 h-10 rounded bg-red-950 border border-red-500 flex items-center justify-center text-red-400 font-bold text-xl">
                ⚠
              </div>
              <div>
                <span className="text-xs font-mono tracking-widest text-red-400 font-bold uppercase">
                  INSOLVENCY PROCEEDINGS // RUN TERMINATED
                </span>
                <h2 className="text-2xl font-bold font-sans text-red-100 m-0">
                  CORPORATE BANKRUPTCY
                </h2>
              </div>
            </div>
            <p className="text-sm font-mono text-slate-300 leading-relaxed m-0">
              Cash reserves have been depleted into a deficit (₹{(data.company?.cash ?? 0).toLocaleString()}). All executive authority and departmental operations have been terminated under statutory insolvency proceedings.
            </p>
            <div className="p-3 bg-red-950/40 border border-red-500/40 text-xs font-mono text-red-300">
              Your final score has been calculated and submitted to the Corporate Leaderboard. No further decisions, board meetings, or quarter progression are permitted.
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/hq/reports/annual";
                }}
                className="game-button gold px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer"
              >
                <span>[ VIEW FINAL REPORT ]</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/hq/leaderboard";
                }}
                className="game-button px-6 py-2.5 text-xs font-mono font-bold tracking-widest cursor-pointer text-amber-400 border border-amber-500/50 bg-neutral-900"
              >
                <span>[ VIEW LEADERBOARD ]</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
