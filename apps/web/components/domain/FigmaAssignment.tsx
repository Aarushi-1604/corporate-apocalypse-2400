"use client";

import { ReactNode } from "react";
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

function FrameCorners() {
  return (
    <div className="frame-corners" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}

function CheckIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="m5 12 4 4L19 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
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

function ArrowIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface FigmaAssignmentProps {
  data: RegisterResponse;
  onAccept: () => void;
}

export function FigmaAssignment({ data, onAccept }: FigmaAssignmentProps) {
  const { company, resumed } = data;

  // Format cash into standard display (e.g. ₹100,000 or ₹1.2 CR if large)
  const formatCash = (amount: number) => {
    if (amount >= 10000000) {
      return `₹${(amount / 10000000).toFixed(1)} CR`;
    } else if (amount >= 100000) {
      return `₹${(amount / 100000).toFixed(1)} LAKH`;
    }
    return `₹${amount.toLocaleString()}`;
  };

  return (
    <main className="screen assignment-screen">
      <div className="appointment-beam" />
      <div className="appointment-copy">
        <div className="eyebrow">EXECUTIVE APPOINTMENT PROTOCOL</div>
        <h2>
          YOU HAVE BEEN
          <br />
          APPOINTED CEO
        </h2>
        <p>
          The Board has selected you to lead an enterprise on the edge of
          extraordinary growth—and systemic collapse.
        </p>

        {resumed && (
          <div className="resuming-badge">
            <i />
            <span>RESUMING ACTIVE SESSION // QUARTER {data.current_quarter}</span>
          </div>
        )}

        <div className="seal">
          <BrandMark />
          <span>
            RATIFIED BY
            <br />
            THE CENTRAL BOARD
          </span>
        </div>
      </div>

      <section className="company-dossier">
        <FrameCorners />
        <div className="dossier-topline">
          <span>CORPORATE DOSSIER</span>
          <span>SESSION // {data.session_id.slice(0, 8).toUpperCase()}</span>
        </div>

        <div className="company-logo">
          <BrandMark />
        </div>

        <div className="company-title">
          <small>ASSIGNED ENTERPRISE</small>
          <h1>{company.name}</h1>
          <p>{company.sector.toUpperCase()}</p>
        </div>

        <div className="capital">
          <span>STARTING CAPITAL</span>
          <strong>{formatCash(company.cash)}</strong>
        </div>

        <div className="traits">
          <div>
            <span className="trait-heading positive">STRENGTHS</span>
            <p>
              <CheckIcon size={16} />
              <span>{company.unique_strength}</span>
            </p>
            {company.unique_passive_ability && (
              <p>
                <CheckIcon size={16} />
                <span>{company.unique_passive_ability}</span>
              </p>
            )}
          </div>
          <div>
            <span className="trait-heading negative">WEAKNESSES</span>
            <p>
              <WarningIcon size={16} />
              <span>{company.unique_weakness}</span>
            </p>
          </div>
        </div>

        <blockquote>
          “{company.backstory || "Power is never given. It is only assigned with expectations."}”
        </blockquote>

        <button
          className="game-button gold"
          onClick={onAccept}
          type="button"
        >
          <span>{resumed ? "RESUME EXECUTIVE ROLE" : "ACCEPT ROLE"}</span>
          <ArrowIcon size={18} />
        </button>
      </section>
    </main>
  );
}
