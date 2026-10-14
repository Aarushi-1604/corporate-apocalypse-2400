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

  const allFiveDone = opsDone && marketDone && rdDone && clientDone && pressDone;
  const isLocked = !allFiveDone && !activeBoard;

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
    <main className="screen map-screen" style={{ background: "#06070a", overflowY: "auto" }}>
      <SystemBar
        section={`EXECUTIVE BOARD ROOM // Q0${displayQuarter} STRATEGIC RATIFICATION`}
        companyName={session?.company?.name}
        capital={latestCash}
        danger={fired}
        onBack={() => router.push("/hq")}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10 flex flex-col gap-8 min-h-[calc(100vh-56px)] justify-center">
        {/* State 1: Gated / Locked screen */}
        {isLocked && !concluded && !fired && (
          <div className="p-8 border-2 border-red-900/60 bg-red-950/20 backdrop-blur-md rounded flex flex-col gap-6 text-center max-w-2xl mx-auto">
            <div className="flex items-center justify-center gap-3 text-red-500 font-mono tracking-widest text-sm font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              ACCESS RESTRICTED // CLEARANCE INSUFFICIENT
            </div>
            <h1 className="text-3xl font-bold font-sans text-white">
              BOARD MEETING LOCKED
            </h1>
            <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
              The Board of Directors will only convene after ALL FIVE quarterly operational activities have been formally committed and archived:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left font-mono text-xs">
              <div className={`p-3 border ${opsDone ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300" : "border-neutral-800 bg-neutral-900/50 text-neutral-400"}`}>
                1. FINANCE &amp; OPERATIONS: {opsDone ? "DONE" : "PENDING"}
              </div>
              <div className={`p-3 border ${marketDone ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300" : "border-neutral-800 bg-neutral-900/50 text-neutral-400"}`}>
                2. MARKETING &amp; ACQUISITIONS: {marketDone ? "DONE" : "PENDING"}
              </div>
              <div className={`p-3 border ${rdDone ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300" : "border-neutral-800 bg-neutral-900/50 text-neutral-400"}`}>
                3. RESEARCH &amp; DEVELOPMENT: {rdDone ? "DONE" : "PENDING"}
              </div>
              <div className={`p-3 border ${clientDone ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300" : "border-neutral-800 bg-neutral-900/50 text-neutral-400"}`}>
                4. CLIENT WORLD NEGOTIATION: {clientDone ? "DONE" : "PENDING"}
              </div>
              <div className={`p-3 border sm:col-span-2 ${pressDone ? "border-emerald-500/60 bg-emerald-950/30 text-emerald-300" : "border-neutral-800 bg-neutral-900/50 text-neutral-400"}`}>
                5. PRESS WORLD CONFERENCE: {pressDone ? "DONE" : "PENDING"}
              </div>
            </div>

            <div className="pt-4 flex justify-center gap-4">
              <button
                type="button"
                onClick={() => router.push("/hq")}
                className="px-6 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-sm tracking-wider uppercase"
              >
                RETURN TO HQ MAP
              </button>
            </div>
          </div>
        )}

        {/* State 2: Terminated / CEO Fired */}
        {fired && (
          <div className="p-8 border-2 border-red-600 bg-black/90 backdrop-blur-md rounded flex flex-col gap-6 text-center max-w-xl mx-auto">
            <h1 className="text-4xl font-bold font-mono tracking-widest text-red-500">
              TERMINATED
            </h1>
            <p className="text-neutral-300 leading-relaxed">
              The Board of Directors has voted to remove you as Chief Executive Officer effective immediately. Your corporate credentials and discretionary authority have been revoked.
            </p>
            <button
              onClick={handleRestart}
              className="mt-4 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-mono font-bold tracking-widest uppercase rounded"
            >
              ACCEPT A NEW APPOINTMENT
            </button>
          </div>
        )}

        {/* State 3: Meeting Successfully Concluded -> Advance Quarter */}
        {concluded && !fired && (
          <div className="p-8 border-2 border-emerald-500/60 bg-black/90 backdrop-blur-md rounded flex flex-col gap-6 text-center max-w-xl mx-auto animate-in fade-in">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-mono tracking-widest text-sm font-bold">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              CONFIDENCE RATIFIED // EXECUTIVE MANDATE RENEWED
            </div>
            <h1 className="text-3xl font-bold font-sans text-white">
              QUARTER {completedQuarter ?? meetingQuarter} SURVIVED
            </h1>
            <p className="text-neutral-300 leading-relaxed text-sm md:text-base">
              The Board of Directors has formally approved your strategic execution and ratified your operational governance for the quarter.
            </p>
            {finalScore !== null && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 font-mono text-sm text-emerald-300">
                FINAL BOARD CONFIDENCE: <strong>{finalScore.toFixed(0)}%</strong>
              </div>
            )}
            <button
              onClick={handleProceedToNextQuarter}
              className="mt-2 px-8 py-3.5 bg-emerald-600 hover:bg-emerald-500 text-black font-mono font-bold tracking-widest uppercase transition-all shadow-lg shadow-emerald-950"
            >
              {(completedQuarter ?? meetingQuarter) < 4
                ? `ENTER QUARTER ${(completedQuarter ?? meetingQuarter) + 1} CITY DISTRICT →`
                : "PROCEED TO ANNUAL SHAREHOLDER REPORT →"}
            </button>
          </div>
        )}

        {/* State 4: Active Board Meeting in Progress */}
        {!isLocked && !concluded && !fired && activeBoard && speakerMeta && (
          <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            {/* Board Header & Progress */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-neutral-800 gap-4">
              <div>
                <span className="font-mono text-xs tracking-widest text-amber-500 uppercase">
                  {speakerMeta.badge} // EXCHANGE {activeBoard.sequence + 1} OF {activeBoard.total_exchanges}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold font-sans text-white tracking-wide mt-1">
                  {speakerMeta.title}
                </h1>
                <p className="text-xs font-mono text-neutral-400 mt-0.5">
                  {speakerMeta.subtitle}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {Array.from({ length: activeBoard.total_exchanges }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 w-8 rounded-sm ${
                      i < activeBoard.sequence
                        ? "bg-emerald-500"
                        : i === activeBoard.sequence
                        ? "bg-amber-500 animate-pulse"
                        : "bg-neutral-800"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Inquisitor Dialogue Card */}
            <div className="p-6 md:p-8 bg-black/80 border border-amber-900/40 rounded-sm relative shadow-2xl">
              <span className="text-xs font-mono text-amber-400/80 uppercase tracking-widest font-bold">
                DIRECT INQUIRY // EXECUTIVE CHAMBER:
              </span>
              <p className="mt-3 text-lg md:text-2xl text-slate-100 font-sans italic leading-relaxed border-l-4 border-amber-500 pl-4 py-1">
                “{activeBoard.question}”
              </p>
            </div>

            {/* Response Options (Exactly 4 Distinct Options) */}
            <div className="flex flex-col gap-3.5 pt-2">
              <span className="text-xs font-mono text-neutral-400 tracking-wider">
                SELECT AUTHORITATIVE CEO RESPONSE ({activeBoard.options.length} OPTIONS PRESENTED):
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {activeBoard.options.map((opt, i) => (
                  <button
                    key={i}
                    disabled={submitting}
                    onClick={() => handleRespond(i)}
                    className={`p-5 text-left border rounded transition-all duration-150 flex flex-col justify-between gap-3 ${
                      selectedIdx === i
                        ? "border-amber-400 bg-amber-950/40 text-white"
                        : "border-neutral-800 bg-neutral-950 hover:border-amber-500/60 hover:bg-neutral-900 text-neutral-200"
                    } ${submitting ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono text-neutral-500">
                      <span>RESPONSE PROTOCOL 0{i + 1}</span>
                      <span className="text-amber-500/70">OPTION #{i + 1}</span>
                    </div>
                    <p className="text-sm md:text-base font-sans font-medium text-white leading-snug">
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