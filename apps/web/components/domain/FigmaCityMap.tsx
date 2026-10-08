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

export function SystemBar({
  section,
  companyName,
  capital,
  onBack,
  danger = false,
}: {
  section: string;
  companyName?: string;
  capital?: number;
  onBack?: () => void;
  danger?: boolean;
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
}

export function FigmaCityMap({
  data,
  onEnterHQ,
  onVisitClient,
  onVisitPress,
}: FigmaCityMapProps) {
  const [notice, setNotice] = useState("");

  const handleClientClick = () => {
    if (onVisitClient) {
      onVisitClient();
    } else {
      setNotice("CLIENT OFFICE // TRANSIT CLEARANCE PENDING");
      window.setTimeout(() => setNotice(""), 2400);
    }
  };

  const handlePressClick = () => {
    if (onVisitPress) {
      onVisitPress();
    } else {
      setNotice("PRESS // TRANSIT CLEARANCE PENDING");
      window.setTimeout(() => setNotice(""), 2400);
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
        className="map-hotspot city-client"
        aria-label="Visit Client Office"
        onClick={handleClientClick}
        type="button"
      >
        <span>
          <kbd>E</kbd> VISIT CLIENT OFFICE
        </span>
      </button>
      <button
        className="map-hotspot city-press"
        aria-label="Visit Press"
        onClick={handlePressClick}
        type="button"
      >
        <span>
          <kbd>E</kbd> VISIT PRESS
        </span>
      </button>
      <div className="map-hint">
        SELECT A LOCATION <span>•</span> BUILDINGS ARE INTERACTIVE
      </div>
      {notice && <div className="world-notice">{notice}</div>}
    </main>
  );
}

