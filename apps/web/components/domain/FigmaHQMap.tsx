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

  const opsLocked = Boolean(departmentLocks?.operations?.locked);
  const marketLocked = Boolean(departmentLocks?.market?.locked);
  const rdLocked = Boolean(departmentLocks?.rd?.locked);

  const handleBoardClick = () => {
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
    </main>
  );
}
