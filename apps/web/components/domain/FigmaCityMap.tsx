"use client";

import { useState } from "react";
import { type RegisterResponse } from "@/lib/api/registration";

function BrandMark() {
  return (
    <div className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
    </div>
  );
}

function formatCapital(amount?: number) {
  if (amount === undefined || isNaN(amount)) return "—";
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)} CR`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)} LAKH`;
  }
  return `₹${amount.toLocaleString()}`;
}

import { LogoutButton } from "./LogoutButton";

export function SystemBar({
  section,
  companyName,
  capital,
  onBack,
  danger = false,
  showLogout = true,
}: {
  section: string;
  companyName?: string;
  capital?: number;
  onBack?: () => void;
  danger?: boolean;
  showLogout?: boolean;
}) {
  return (
    <header className="system-bar">
      <div className="system-brand">
        <BrandMark />
        <span>{companyName ? companyName.toUpperCase() : "APEX DYNAMICS"}</span>
      </div>
      <div className={`location-readout ${danger ? "is-danger" : ""}`}>
        <i />
        <span>{section}</span>
      </div>
      <div className="system-stats">
        <span>CAPITAL</span>
        <strong>{formatCapital(capital)}</strong>
        {showLogout && <LogoutButton />}
        {onBack && (
          <button className="key-control" onClick={onBack} type="button">
            <kbd>ESC</kbd> RETURN
          </button>
        )}
      </div>
    </header>
  );
}

interface FigmaCityMapProps {
  data: RegisterResponse;
  onEnterHQ: () => void;
  onVisitClient?: () => void;
  onVisitPress?: () => void;
  departmentLocks?: {
    operations?: { locked: boolean } | null;
    market?: { locked: boolean } | null;
    rd?: { locked: boolean } | null;
    client?: { locked: boolean } | null;
    press?: { locked: boolean } | null;
  } | null;
}

export function FigmaCityMap({
  data,
  onEnterHQ,
  onVisitClient,
  onVisitPress,
  departmentLocks,
}: FigmaCityMapProps) {
  const [notice, setNotice] = useState("");

  const opsDone = Boolean(departmentLocks?.operations?.locked);
  const marketDone = Boolean(departmentLocks?.market?.locked);
  const rdDone = Boolean(departmentLocks?.rd?.locked);
  const stageAComplete = opsDone && marketDone && rdDone;

  const clientDone = Boolean(departmentLocks?.client?.locked);
  const pressDone = Boolean(departmentLocks?.press?.locked);

  const quarter = data.current_quarter ?? 1;

  const clientUnlocked = stageAComplete;
  const pressUnlocked = quarter <= 2 ? stageAComplete : stageAComplete && clientDone;

  const handleClientClick = () => {
    if (!clientUnlocked) {
      setNotice("CLIENT OFFICE // ACCESS LOCKED — COMPLETE ALL 3 HQ DEPARTMENTS FIRST");
      window.setTimeout(() => setNotice(""), 3000);
      return;
    }
    if (onVisitClient) {
      onVisitClient();
    }
  };

  const handlePressClick = () => {
    if (!pressUnlocked) {
      if (!stageAComplete) {
        setNotice("PRESS // ACCESS LOCKED — COMPLETE ALL 3 HQ DEPARTMENTS FIRST");
      } else {
        setNotice("PRESS // ACCESS LOCKED — COMPLETE CLIENT WORLD ACTIVITIES FIRST");
      }
      window.setTimeout(() => setNotice(""), 3000);
      return;
    }
    if (onVisitPress) {
      onVisitPress();
    }
  };

  return (
    <main className="screen map-screen city-screen">
      <SystemBar
        section="NEW KALKI CITY // CORPORATE DISTRICT"
        companyName={data.company?.name}
        capital={data.company?.cash}
      />
      <img
        className="world-map"
        src="/assets/city-map.png"
        alt="The corporate district of New Kalki City"
      />
      <div className="map-vignette" />
      <div className="map-intro">
        <span>SECTOR 01</span>
        <strong>NEW KALKI CITY</strong>
      </div>
      <button
        className="map-hotspot city-hq"
        aria-label="Enter Headquarters"
        onClick={onEnterHQ}
        type="button"
      >
        <span>
          <kbd>E</kbd> ENTER HEADQUARTERS
        </span>
      </button>
      <button
        className={`map-hotspot city-client ${
          clientDone ? "dept-locked" : !clientUnlocked ? "locked" : ""
        }`}
        aria-label={
          clientDone
            ? "Client Office (Completed)"
            : !clientUnlocked
            ? "Client Office locked"
            : "Visit Client Office"
        }
        onClick={handleClientClick}
        type="button"
      >
        <span>
          {clientDone ? (
            "CLIENT // DONE"
          ) : !clientUnlocked ? (
            "CLIENT // LOCKED"
          ) : (
            <>
              <kbd>E</kbd> CLIENT // TO DO
            </>
          )}
        </span>
      </button>
      <button
        className={`map-hotspot city-press ${
          pressDone ? "dept-locked" : !pressUnlocked ? "locked" : ""
        }`}
        aria-label={
          pressDone
            ? "Press (Report Completed)"
            : !pressUnlocked
            ? "Press locked"
            : "Visit Press"
        }
        onClick={handlePressClick}
        type="button"
      >
        <span>
          {pressDone ? (
            "PRESS // DONE"
          ) : !pressUnlocked ? (
            "PRESS // LOCKED"
          ) : (
            <>
              <kbd>E</kbd> PRESS // TO DO
            </>
          )}
        </span>
      </button>
      <div className="map-hint">
        SELECT A LOCATION <span>•</span> BUILDINGS ARE INTERACTIVE
      </div>
      {notice && <div className="world-notice">{notice}</div>}
    </main>
  );
}

