"use client";

import { FormEvent, ReactNode, useState } from "react";
import { registerPlayer, type RegisterResponse, type RegisterPayload } from "@/lib/api/registration";

type IconName = "arrow";

function Icon({ size = 18 }: { name?: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      height={size}
      viewBox="0 0 24 24"
      width={size}
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
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

function GameButton({
  children,
  onClick,
  type = "button",
  variant = "gold",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "gold" | "cyan" | "danger" | "ghost";
  disabled?: boolean;
}) {
  return (
    <button
      className={`game-button ${variant}`}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <span>{children}</span>
      <Icon name="arrow" size={18} />
    </button>
  );
}

interface FigmaLoginProps {
  onSuccess: (response: RegisterResponse) => void;
}

const SIT_BRANCHES = [
  "Artificial Intelligence and Machine Learning",
  "Computer Science Engineering",
  "Robotics and Automation",
  "Robotics and AI",
  "Electronics and Telecommunication Engineering",
  "Civil Engineering",
  "Mechanical Engineering",
  "M.Tech",
] as const;

const SIT_YEARS = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
] as const;

export function FigmaLogin({ onSuccess }: FigmaLoginProps) {
  const [mode, setMode] = useState<"SIT" | "NON_SIT">("SIT");

  const [sitForm, setSitForm] = useState({
    full_name: "",
    email: "",
    prn: "",
    department: "Computer Science Engineering",
    year_of_study: "Year 2",
  });

  const [nonSitForm, setNonSitForm] = useState({
    full_name: "",
    phone_number: "",
    institution_name: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    setError(null);

    let payload: RegisterPayload;

    if (mode === "SIT") {
      const emailClean = sitForm.email.trim();
      if (!emailClean.toLowerCase().endsWith("@sitpune.edu.in")) {
        setError("SIT email must end with @sitpune.edu.in");
        return;
      }
      if (!sitForm.prn.trim()) {
        setError("PRN is required for SIT students.");
        return;
      }

      payload = {
        registration_type: "SIT",
        full_name: sitForm.full_name.trim(),
        email: emailClean,
        prn: sitForm.prn.trim(),
        department: sitForm.department,
        year_of_study: sitForm.year_of_study,
      };
    } else {
      if (!nonSitForm.full_name.trim()) {
        setError("Full Name is required.");
        return;
      }
      if (!nonSitForm.phone_number.trim()) {
        setError("Phone number is required for Non-SIT students.");
        return;
      }
      if (!nonSitForm.institution_name.trim()) {
        setError("Institution name is required for Non-SIT students.");
        return;
      }

      payload = {
        registration_type: "NON_SIT",
        full_name: nonSitForm.full_name.trim(),
        phone_number: nonSitForm.phone_number.trim(),
        institution_name: nonSitForm.institution_name.trim(),
      };
    }

    setSubmitting(true);

    try {
      const response = await registerPlayer(payload);
      onSuccess(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="screen login-screen">
      <div className="login-atmosphere" />
      <div className="login-grid" />
      <section className="title-lockup">
        <div className="eyebrow">A CORPORATE SURVIVAL SIMULATION</div>
        <h1>
          <span>CORPORATE</span>
          <span>APOCALYPSE</span>
          <b>2400</b>
        </h1>
        <div className="title-rule">
          <i />
          <BrandMark />
          <i />
        </div>
        <p>THE WORLD IS RUN BY CORPORATIONS.</p>
        <p>YOU HAVE JUST BEEN GIVEN ONE.</p>
      </section>

      <form className="access-panel" onSubmit={handleSubmit}>
        <FrameCorners />
        <div className="panel-index">
          CEO ACCESS // {mode === "SIT" ? "SIT UPLINK" : "EXTERNAL UPLINK"}
        </div>
        <div className="form-heading">
          <span>IDENTITY REGISTRATION</span>
          <small>ENCRYPTED UPLINK ACTIVE</small>
        </div>

        {/* Cyberpunk Mode Switcher */}
        <div className="mode-toggle-group" role="tablist">
          <button
            type="button"
            className={`mode-toggle-btn ${mode === "SIT" ? "active" : ""}`}
            onClick={() => {
              setMode("SIT");
              setError(null);
            }}
          >
            <i className="status-dot" /> SIT STUDENT
          </button>
          <button
            type="button"
            className={`mode-toggle-btn ${mode === "NON_SIT" ? "active" : ""}`}
            onClick={() => {
              setMode("NON_SIT");
              setError(null);
            }}
          >
            <i className="status-dot" /> NON-SIT STUDENT
          </button>
        </div>

        {mode === "SIT" ? (
          <>
            <label>
              <span>FULL NAME</span>
              <input
                required
                aria-label="Full Name"
                placeholder="Enter legal identity"
                value={sitForm.full_name}
                onChange={(e) => setSitForm({ ...sitForm, full_name: e.target.value })}
                disabled={submitting}
              />
            </label>

            <div className="form-row">
              <label>
                <span>SIT EMAIL</span>
                <input
                  required
                  aria-label="SIT Email"
                  placeholder="name@sitpune.edu.in"
                  type="email"
                  value={sitForm.email}
                  onChange={(e) => setSitForm({ ...sitForm, email: e.target.value })}
                  disabled={submitting}
                />
              </label>

              <label>
                <span>PRN</span>
                <input
                  required
                  aria-label="PRN"
                  placeholder="Registration no."
                  value={sitForm.prn}
                  onChange={(e) => setSitForm({ ...sitForm, prn: e.target.value })}
                  disabled={submitting}
                />
              </label>
            </div>

            <div className="form-row">
              <label>
                <span>BRANCH</span>
                <select
                  aria-label="Branch"
                  value={sitForm.department}
                  onChange={(e) => setSitForm({ ...sitForm, department: e.target.value })}
                  disabled={submitting}
                >
                  {SIT_BRANCHES.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>YEAR</span>
                <select
                  aria-label="Year"
                  value={sitForm.year_of_study}
                  onChange={(e) => setSitForm({ ...sitForm, year_of_study: e.target.value })}
                  disabled={submitting}
                >
                  {SIT_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        ) : (
          <>
            <label>
              <span>FULL NAME</span>
              <input
                required
                aria-label="Full Name"
                placeholder="Enter legal identity"
                value={nonSitForm.full_name}
                onChange={(e) => setNonSitForm({ ...nonSitForm, full_name: e.target.value })}
                disabled={submitting}
              />
            </label>

            <label>
              <span>PHONE NUMBER</span>
              <input
                required
                aria-label="Phone Number"
                placeholder="Enter mobile contact no."
                type="tel"
                value={nonSitForm.phone_number}
                onChange={(e) => setNonSitForm({ ...nonSitForm, phone_number: e.target.value })}
                disabled={submitting}
              />
            </label>

            <label>
              <span>INSTITUTION NAME</span>
              <input
                required
                aria-label="Institution Name"
                placeholder="Enter college / university name"
                value={nonSitForm.institution_name}
                onChange={(e) => setNonSitForm({ ...nonSitForm, institution_name: e.target.value })}
                disabled={submitting}
              />
            </label>
          </>
        )}

        {error && <div className="form-error-msg">{error}</div>}

        <GameButton type="submit" disabled={submitting}>
          {submitting ? "AUTHENTICATING UPLINK..." : "ENTER THE WORLD"}
        </GameButton>

        <div className="clearance">
          CLEARANCE: PROVISIONAL <i /> NODE 24-A
        </div>
      </form>

      <div className="build-number">CA // BUILD 2400.6</div>
    </main>
  );
}
