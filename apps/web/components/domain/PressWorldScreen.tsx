"use client";
import { useEffect, useMemo, useState } from "react";
import { type RegisterResponse } from "@/lib/api/registration";
import { SystemBar } from "./FigmaCityMap";
import { type PressSession, useSubmitPressStatement } from "@/lib/hooks/use-press";

interface PressWorldScreenProps {
  session: RegisterResponse;
  pressData: PressSession;
  onReturnToCity: () => void;
  onReturnToHQ: () => void;
}

export function PressWorldScreen({
  session,
  pressData,
  onReturnToCity,
  onReturnToHQ,
}: PressWorldScreenProps) {
  const [statementText, setStatementText] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const submitMutation = useSubmitPressStatement(session.company_id);

  // Global ESC key listener to exit to City Map
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onReturnToCity();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onReturnToCity]);

  // Character, word, and sentence validation
  const words = useMemo(() => {
    const trimmed = statementText.trim();
    return trimmed ? trimmed.split(/\s+/) : [];
  }, [statementText]);

  const wordCount = words.length;
  const isWordCountValid = wordCount > 0 && wordCount <= 50;

  // Single sentence constraint validation
  const sentenceCount = useMemo(() => {
    const trimmed = statementText.trim();
    if (!trimmed) return 0;
    const parts = trimmed.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    return parts.length;
  }, [statementText]);

  const isSentenceValid = sentenceCount === 1;
  const canSubmit = isWordCountValid && isSentenceValid && !submitMutation.isPending;

  const handleSubmitStatement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitError(null);

    try {
      await submitMutation.mutateAsync(statementText.trim());
      setStatementText("");
    } catch (err: any) {
      setSubmitError(err.message || "Failed to deliver statement.");
    }
  };

  const isCompleted = pressData.status === "COMPLETED";
  const isLocked = pressData.status === "LOCKED";
  const exchangeIndex = pressData.current_exchange_index; // 0, 1, or 2

  return (
    <main className="press-screen" role="region" aria-label="Press World Live Conference">
      {/* Visual background, vignetting, scanlines, camera flashes */}
      <div className="press-environment" aria-hidden="true" />
      <div className="press-vignette" aria-hidden="true" />
      <div className="press-scanlines" aria-hidden="true" />

      <div className="camera-flash-layer" aria-hidden="true">
        <div className="camera-flash" />
        <div className="camera-flash" />
        <div className="camera-flash" />
        <div className="camera-flash" />
        <div className="camera-flash" />
      </div>

      {/* Top System Bar */}
      <SystemBar
        section="NEW KALKI PRESS CORPS // LIVE BROADCAST"
        companyName={session.company?.name}
        capital={session.company?.cash}
        danger={true}
        onBack={onReturnToCity}
      />

      <div className="press-content">
        {/* Stage: LOCKED Notice (e.g. Q3/Q4 or pending departments) */}
        {isLocked && (
          <div className="breaking-dossier" style={{ margin: "auto", maxWidth: "700px" }}>
            <div className="breaking-dossier-header">
              <span className="breaking-ticker">
                <span className="live-beacon" style={{ background: "#d9bc7a", boxShadow: "0 0 10px #d9bc7a" }} />
                RESTRICTED CLEARANCE // TRANSIT LOCKED
              </span>
            </div>
            <h2 className="breaking-headline">PRESS CONFERENCE UNAVAILABLE</h2>
            <p className="breaking-context">
              {pressData.lock_reason ??
                "You must complete Finance & Operations, Marketing, and R&D before facing the press corps."}
            </p>
            <div className="flex gap-4 mt-6">
              <button
                type="button"
                className="deliver-statement-btn"
                onClick={onReturnToHQ}
              >
                RETURN TO HEADQUARTERS
              </button>
              <button
                type="button"
                className="deliver-statement-btn"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
                onClick={onReturnToCity}
              >
                DISTRICT MAP
              </button>
            </div>
          </div>
        )}

        {/* Stage: COMPLETED (Corporate Times frontpage & consequences) */}
        {!isLocked && isCompleted && (
          <div className="headline-reveal">
            <div className="newspaper-masthead">
              <div className="newspaper-title">THE CORPORATE TIMES</div>
              <div className="newspaper-subheading">
                NEW KALKI CITY DAILY // Q{pressData.quarter} SPECIAL CRISIS EDITION // CERTIFIED ARCHIVE
              </div>
            </div>

            <h1 className="revealed-headline">{pressData.headline}</h1>

            <div className="revealed-article-body">{pressData.article_body}</div>

            {pressData.media_verdict && (
              <div className="p-3 mb-4 border border-red-500/30 bg-red-950/20 text-red-200 text-sm italic">
                <strong>EDITORIAL VERDICT:</strong> {pressData.media_verdict}
              </div>
            )}

            {/* KPI Delta Cards */}
            {pressData.stat_deltas && (
              <div className="press-consequences">
                <span className="text-xs tracking-widest text-[#a0978e] font-mono">
                  AUTHORITATIVE MARKET IMPACT RECORD
                </span>
                <div className="consequences-grid">
                  {Object.entries(pressData.stat_deltas).map(([kpi, val]) => {
                    if (typeof val !== "number") return null;
                    const isPositive = val >= 0;
                    return (
                      <div
                        key={kpi}
                        className={`kpi-delta-card ${isPositive ? "pos" : "neg"}`}
                      >
                        <span>{kpi.replace("_", " ").toUpperCase()}</span>
                        <strong>
                          {isPositive ? `+${val.toFixed(1)}` : val.toFixed(1)}
                        </strong>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* CEO Commitments On Record */}
            {pressData.commitments && pressData.commitments.length > 0 && (
              <div className="commitments-panel">
                <div className="commitments-title">BINDING CEO COMMITMENTS ON RECORD</div>
                <ul className="commitments-list">
                  {pressData.commitments.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-between items-center mt-8 pt-4 border-t border-neutral-800">
              <button
                type="button"
                className="deliver-statement-btn"
                onClick={onReturnToHQ}
              >
                RETURN TO EXECUTIVE HQ
              </button>
              <button
                type="button"
                className="deliver-statement-btn"
                style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}
                onClick={onReturnToCity}
              >
                EXIT TO DISTRICT MAP
              </button>
            </div>
          </div>
        )}

        {/* Stage: ACTIVE Live Conference (Breaking Dossier + Journalist + Microphone) */}
        {!isLocked && !isCompleted && (
          <>
            {/* 1. Breaking News Dossier */}
            <section className="breaking-dossier" aria-label="Breaking News Crisis Dossier">
              <div className="breaking-dossier-header">
                <div className="breaking-ticker">
                  <span className="live-beacon" />
                  BREAKING // HOSTILE PRESS BRIEFING
                </div>
                <span className="exchange-progress-badge">
                  EXCHANGE {exchangeIndex + 1} OF 3
                </span>
              </div>

              <h2 className="breaking-headline">{pressData.headline}</h2>
              <p className="breaking-context">{pressData.context}</p>

              {pressData.established_facts && pressData.established_facts.length > 0 && (
                <div className="breaking-facts-bar">
                  {pressData.established_facts.map((fact, i) => (
                    <span key={i} className="fact-chip">
                      {fact}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* 2. Journalist Follow-up Box */}
            <div className="response-stage">
              <section className="journalist-inquiry-box" aria-label="Journalist Inquiry">
                <div className="journalist-meta">
                  <div className="journalist-identity">
                    <div className="journalist-avatar">
                      {pressData.journalist?.name?.charAt(0) ?? "J"}
                    </div>
                    <div>
                      <div className="journalist-name">
                        {pressData.journalist?.name ?? "INVESTIGATIVE CORRESPONDENT"}
                      </div>
                      <div className="journalist-outlet">
                        {pressData.journalist?.outlet ?? "THE CORPORATE TIMES"}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-[#a0978e] font-mono">
                    {pressData.tone ? `TONE: ${pressData.tone}` : "LIVE BROADCAST"}
                  </div>
                </div>

                <p className="journalist-question">
                  &ldquo;{pressData.current_question}&rdquo;
                </p>
              </section>

              {/* LLM Evaluating state animation */}
              {submitMutation.isPending ? (
                <div className="press-evaluating">
                  <div className="radar-spinner" />
                  <div className="evaluating-status">
                    EVALUATING EXECUTIVE STATEMENTS // BROADCAST REACTION IN PROGRESS...
                  </div>
                </div>
              ) : (
                /* 3. CEO Microphone Deck */
                <form
                  onSubmit={handleSubmitStatement}
                  className="microphone-deck"
                  aria-label="Podium Microphone Console"
                >
                  <div className="microphone-header">
                    <div className="microphone-label">
                      <span className="mic-active-dot" />
                      CEO PODIUM MICROPHONE // BROADCAST FEED
                    </div>
                    <div className="constraint-meters">
                      <span
                        className={`constraint-tag ${
                          isWordCountValid ? "valid" : wordCount > 50 ? "invalid" : ""
                        }`}
                      >
                        WORDS: {wordCount} / 50
                      </span>
                      <span
                        className={`constraint-tag ${
                          isSentenceValid ? "valid" : sentenceCount > 1 ? "invalid" : ""
                        }`}
                      >
                        SENTENCES: {sentenceCount} / 1
                      </span>
                    </div>
                  </div>

                  <textarea
                    id="ceo-press-statement"
                    value={statementText}
                    onChange={(e) => setStatementText(e.target.value)}
                    placeholder="Deliver your authoritative statement into the microphone. Exactly 1 sentence, maximum 50 words..."
                    rows={2}
                    className="microphone-input"
                    disabled={submitMutation.isPending}
                    maxLength={500}
                    autoFocus
                  />

                  {submitError && (
                    <div className="text-xs text-red-400 mt-2 font-mono">
                      ERROR: {submitError}
                    </div>
                  )}

                  <div className="microphone-footer">
                    <div className="response-rules-hint">
                      RULES: <span>ONE SENTENCE MAXIMUM</span> • <span>50 WORDS MAXIMUM</span>
                    </div>
                    <button
                      type="submit"
                      disabled={!canSubmit}
                      className="deliver-statement-btn"
                    >
                      {exchangeIndex === 2 ? "CONCLUDE CONFERENCE" : "DELIVER STATEMENT"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
