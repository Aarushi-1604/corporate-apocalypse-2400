"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-session";
import { useActiveBoard, respondToBoard } from "@/lib/hooks/use-active-board";
import { useDepartmentLocks, useCompanyState } from "@/lib/hooks/use-company-state";
import { restartSession } from "@/lib/hooks/use-restart";
import { SystemBar } from "@/components/domain/FigmaCityMap";

const SPEAKER_TITLES: Record<string, { title: string; subtitle: string; badge: string }> = {
  chairperson: {
    title: "BOARD CHAIRPERSON",
    subtitle: "Executive Governance & Sovereign Compliance",
    badge: "OVERSIGHT",
  },
  lead_investor: {
    title: "LEAD INSTITUTIONAL INVESTOR",
    subtitle: "Capital Allocation & Yield Mandate",
    badge: "CAPITAL",
  },
  cfo: {
    title: "CHIEF FINANCIAL OFFICER",
    subtitle: "Balance Sheet & Solvency Sentinel",
    badge: "TREASURY",
  },
  independent_director: {
    title: "INDEPENDENT DIRECTOR",
    subtitle: "Corporate Ethics & Shareholder Protection",
    badge: "AUDIT",
  },
  employee_rep: {
    title: "SYNDICATE REPRESENTATIVE",
    subtitle: "Labor Force & Operations Council",
    badge: "WORKFORCE",
  },
  government_observer: {
    title: "MUNICIPAL OBSERVER",
    subtitle: "New Kalki Regulatory Commission",
    badge: "REGULATION",
  },
};

export default function BoardRoomPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession();
  const companyId = session?.company_id;
  const sessionQuarter = session?.current_quarter ?? 1;

  const { data: deptLocks, isLoading: locksLoading } = useDepartmentLocks(companyId);
  const { data: activeBoard, isLoading: boardLoading, refetch } = useActiveBoard(companyId);

  // Maintain explicit completed quarter and meeting quarter state
  const meetingQuarter = activeBoard?.quarter ?? sessionQuarter;
  const [completedQuarter, setCompletedQuarter] = useState<number | null>(null);

  // Authoritative company state for the quarter currently being reviewed
  const { data: companyState } = useCompanyState(companyId, completedQuarter ?? meetingQuarter);
  const latestCash = companyState?.cash ?? session?.company?.cash;

  const [submitting, setSubmitting] = useState(false);
  const [fired, setFired] = useState(false);
  const [concluded, setConcluded] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionLoading && (!session || sessionError)) {
      router.replace("/login");
    }
  }, [session, sessionLoading, sessionError, router]);

  // Handle ESC returning to HQ
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/hq");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  // Compute prerequisites
  const opsDone = Boolean(deptLocks?.operations?.locked);
  const marketDone = Boolean(deptLocks?.market?.locked);
  const rdDone = Boolean(deptLocks?.rd?.locked);
  const clientDone = Boolean(deptLocks?.client?.locked);
  const pressDone = Boolean(deptLocks?.press?.locked);

  const q = sessionQuarter ?? 1;
  const prereqsSatisfied =
    q <= 2
      ? opsDone && marketDone && rdDone && clientDone && pressDone
      : opsDone && marketDone && rdDone;
  const isLocked = !prereqsSatisfied && !activeBoard;

  const handleRespond = async (index: number) => {
    if (!activeBoard || submitting) return;
    setSubmitting(true);
    setSelectedIdx(index);

    try {
      const currentActiveQ = activeBoard.quarter ?? sessionQuarter;
      const res = await respondToBoard(activeBoard.exchange_id, index);
      await queryClient.invalidateQueries({ queryKey: ["active-board"] });
      setSelectedIdx(null);

      if (res.session_complete) {
        if (res.fired) {
          setFired(true);
        } else {
          const resolvedQuarter = res.completed_quarter ?? currentActiveQ;
          setCompletedQuarter(resolvedQuarter);
          setConcluded(true);
          setFinalScore(res.new_confidence ?? null);
          // Refresh authoritative company state and department locks
          await queryClient.invalidateQueries({ queryKey: ["company-state"] });
          await queryClient.invalidateQueries({ queryKey: ["department-locks"] });
        }
      } else {
        await refetch();
      }
    } catch (err: any) {
      alert(err.message || "Failed to submit response to the board.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestart = async () => {
    try {
      await restartSession();
      queryClient.clear();
      router.push("/assignment");
    } catch (err: any) {
      alert(err.message || "Restart failed.");
    }
  };

  const handleProceedToNextQuarter = async () => {
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    await queryClient.invalidateQueries({ queryKey: ["company-state"] });
    await queryClient.invalidateQueries({ queryKey: ["department-locks"] });
    await queryClient.invalidateQueries({ queryKey: ["active-board"] });
    if ((completedQuarter ?? meetingQuarter) >= 4) {
      router.push("/hq/reports/annual");
    } else {
      router.push("/city");
    }
  };

  if (sessionLoading || locksLoading || boardLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest">
        CONVENING EXECUTIVE BOARD CHAMBER // HIGH SECURITY CLEARANCE...
      </div>
    );
  }

  const speakerMeta = activeBoard
    ? SPEAKER_TITLES[activeBoard.speaker] || {
        title: activeBoard.speaker.toUpperCase(),
        subtitle: "Executive Directorate",
        badge: "BOARD",
      }
    : null;

  const displayQuarter = completedQuarter ?? meetingQuarter;

  return (
    <main className="board-screen" role="region" aria-label="Executive Board Room">
      {/* Cinematic Full-Viewport Background & Atmosphere */}
      <div className="board-environment" aria-hidden="true" />
      <div className="board-vignette" aria-hidden="true" />
      <div className="board-scanlines" aria-hidden="true" />

      {/* Top HUD/SystemBar identical to Press World conventions */}
      <SystemBar
        section={`EXECUTIVE BOARD ROOM // Q0${displayQuarter} STRATEGIC RATIFICATION`}
        companyName={session?.company?.name}
        capital={latestCash}
        danger={fired}
        onBack={() => router.push("/hq")}
      />

      <div className="board-content">
        {/* State 1: Gated / Locked screen */}
        {isLocked && !concluded && !fired && (
          <div className="board-card-container">
            <div className="p-8 border-2 border-red-900/60 bg-red-950/40 backdrop-blur-md rounded flex flex-col gap-6 text-center shadow-2xl">
              <div className="flex items-center justify-center gap-3 text-red-500 font-mono tracking-widest text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                ACCESS RESTRICTED // CLEARANCE INSUFFICIENT
              </div>
              <h1 className="text-3xl font-bold font-sans text-white">
                BOARD MEETING LOCKED
              </h1>
              <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                {displayQuarter <= 2
                  ? "The Board of Directors will only convene after ALL FIVE quarterly operational activities have been formally committed and archived:"
                  : "The Board of Directors will convene after ALL THREE Headquarters strategic decisions have been formally committed and archived:"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-mono text-xs">
                <div className={`p-3 border ${opsDone ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 bg-neutral-900/60 text-neutral-400"}`}>
                  1. FINANCE &amp; OPERATIONS: {opsDone ? "DONE" : "PENDING"}
                </div>
                <div className={`p-3 border ${marketDone ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 bg-neutral-900/60 text-neutral-400"}`}>
                  2. MARKETING &amp; ACQUISITIONS: {marketDone ? "DONE" : "PENDING"}
                </div>
                <div className={`p-3 border sm:col-span-${displayQuarter <= 2 ? "1" : "2"} ${rdDone ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 bg-neutral-900/60 text-neutral-400"}`}>
                  3. RESEARCH &amp; DEVELOPMENT: {rdDone ? "DONE" : "PENDING"}
                </div>
                {displayQuarter <= 2 && (
                  <>
                    <div className={`p-3 border ${clientDone ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 bg-neutral-900/60 text-neutral-400"}`}>
                      4. CLIENT WORLD NEGOTIATION: {clientDone ? "DONE" : "PENDING"}
                    </div>
                    <div className={`p-3 border sm:col-span-2 ${pressDone ? "border-emerald-500/60 bg-emerald-950/40 text-emerald-300" : "border-neutral-800 bg-neutral-900/60 text-neutral-400"}`}>
                      5. PRESS WORLD CONFERENCE: {pressDone ? "DONE" : "PENDING"}
                    </div>
                  </>
                )}
              </div>

              <div className="pt-4 flex justify-center gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/hq")}
                  className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-sm tracking-wider uppercase transition-colors"
                >
                  RETURN TO HQ MAP
                </button>
              </div>
            </div>
          </div>
        )}

        {/* State 2: Terminated / CEO Fired */}
        {fired && (
          <div className="board-card-container">
            <div className="p-8 border-2 border-red-600 bg-black/90 backdrop-blur-md rounded flex flex-col gap-6 text-center shadow-2xl">
              <h1 className="text-4xl font-bold font-mono tracking-widest text-red-500">
                TERMINATED
              </h1>
              <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                The Board of Directors has voted to remove you as Chief Executive Officer effective immediately. Your corporate credentials and discretionary authority have been revoked.
              </p>
              <button
                onClick={handleRestart}
                className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-mono font-bold tracking-widest uppercase rounded transition-colors"
              >
                ACCEPT A NEW APPOINTMENT
              </button>
            </div>
          </div>
        )}

        {/* State 3: Meeting Successfully Concluded -> Advance Quarter */}
        {concluded && !fired && (
          <div className="board-card-container">
            <div className="p-8 border-2 border-emerald-500/60 bg-black/90 backdrop-blur-md rounded flex flex-col gap-6 text-center shadow-2xl animate-in fade-in">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono tracking-widest text-sm font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
                CONFIDENCE RATIFIED // EXECUTIVE MANDATE RENEWED
              </div>
              <h1 className="text-3xl font-bold font-sans text-white">
                QUARTER {completedQuarter ?? meetingQuarter} SURVIVED
              </h1>
              <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
                The Board of Directors has formally approved your strategic execution and ratified your operational governance for the quarter.
              </p>
              {finalScore !== null && (
                <div className="p-4 bg-emerald-950/40 border border-emerald-500/40 font-mono text-sm text-emerald-300">
                  FINAL BOARD CONFIDENCE: <strong>{finalScore.toFixed(0)}%</strong>
                </div>
              )}
              <button
                onClick={handleProceedToNextQuarter}
                className="mt-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold tracking-widest uppercase transition-all shadow-lg shadow-emerald-950 hover:shadow-emerald-900"
              >
                {(completedQuarter ?? meetingQuarter) < 4
                  ? `ENTER QUARTER ${(completedQuarter ?? meetingQuarter) + 1} CITY DISTRICT →`
                  : "PROCEED TO ANNUAL SHAREHOLDER REPORT →"}
              </button>
            </div>
          </div>
        )}

        {/* State 4: Active Board Meeting in Progress */}
        {!isLocked && !concluded && !fired && activeBoard && speakerMeta && (
          <div className="flex flex-col flex-1 min-h-[calc(100vh-125px)] justify-between gap-6 animate-in fade-in duration-200">
            {/* Top Section: Speaker Header + Executive Inquiry Box */}
            <div className="flex flex-col gap-5">
              {/* Header with speaker badge and compact meeting progress tracker */}
              <div className="board-header-bar">
                <div className="board-speaker-identity">
                  <span className="board-speaker-badge">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#fbbf24]" />
                    {speakerMeta.badge} // DIRECTORATE DELIBERATION
                  </span>
                  <h1 className="board-speaker-title">
                    {speakerMeta.title}
                  </h1>
                  <p className="board-speaker-subtitle">
                    {speakerMeta.subtitle}
                  </p>
                </div>

                <div className="board-progress-tracker">
                  <span className="board-progress-label">
                    EXCHANGE 0{activeBoard.sequence + 1} / 0{activeBoard.total_exchanges}
                  </span>
                  <div className="board-progress-bars">
                    {Array.from({ length: activeBoard.total_exchanges }).map((_, i) => (
                      <div
                        key={i}
                        className={`board-progress-pip ${
                          i < activeBoard.sequence
                            ? "done"
                            : i === activeBoard.sequence
                            ? "active"
                            : "pending"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Inquisitor Dialogue Card */}
              <div className="board-inquiry-box">
                <div className="board-inquiry-header">
                  <span className="board-inquiry-tag">
                    OFFICIAL EXECUTIVE INQUIRY // ON THE RECORD
                  </span>
                  <span className="text-xs font-mono text-neutral-500">
                    REF: EX-{activeBoard.sequence + 1}
                  </span>
                </div>
                <p className="board-inquiry-quote">
                  “{activeBoard.question}”
                </p>
              </div>
            </div>

            {/* Bottom Section: 4 Response Cards in 2x2 Grid Desktop */}
            <div className="board-options-section">
              <div className="board-options-label">
                <span>SELECT STRATEGIC EXECUTIVE POSITION</span>
                <span>{activeBoard.options.length} OPTIONS PRESENTED</span>
              </div>

              <div className="board-options-grid">
                {activeBoard.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleRespond(i)}
                    className={`board-option-card ${selectedIdx === i ? "selected" : ""}`}
                  >
                    <div className="board-option-meta">
                      <span>PROTOCOL 0{i + 1}</span>
                      <span className="board-option-num">OPTION #{i + 1}</span>
                    </div>
                    <p className="board-option-text">
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}