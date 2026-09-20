"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useAnnualReport } from "@/lib/hooks/use-annual-report";

const OUTCOME_LABELS: Record<string, string> = {
  completed: "Full Year Completed",
  fired: "Terminated by the Board",
  bankrupt: "Company Went Bankrupt",
};

export default function AnnualReportPage() {
  const { data: session } = useSession();
  const { data: report, isLoading, isError } = useAnnualReport(session?.company_id);

  if (isLoading) return <p className="text-neutral-400">Loading annual report...</p>;
  if (isError || !report) {
    return (
      <p className="text-neutral-500">
        No annual report yet -- this becomes available once your session ends (Q4 completion, bankruptcy, or board removal).
      </p>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold">Annual Report</h1>
      <p className="mb-6 text-neutral-400">{OUTCOME_LABELS[report.outcome] ?? report.outcome}</p>

      <div className="rounded border border-neutral-700 bg-neutral-950 p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-neutral-500">Final CEO Score</p>
        <p className="text-5xl font-bold">{report.final_score.toFixed(1)}</p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div className="rounded border border-neutral-800 p-3 text-center">
          <p className="text-neutral-500">Revenue</p>
          <p className="text-lg font-semibold">{report.revenue_score.toFixed(0)}</p>
        </div>
        <div className="rounded border border-neutral-800 p-3 text-center">
          <p className="text-neutral-500">Satisfaction</p>
          <p className="text-lg font-semibold">{report.satisfaction_score.toFixed(0)}</p>
        </div>
        <div className="rounded border border-neutral-800 p-3 text-center">
          <p className="text-neutral-500">Innovation</p>
          <p className="text-lg font-semibold">{report.innovation_score.toFixed(0)}</p>
        </div>
        <div className="rounded border border-neutral-800 p-3 text-center">
          <p className="text-neutral-500">Investor Conf.</p>
          <p className="text-lg font-semibold">{report.investor_score.toFixed(0)}</p>
        </div>
        <div className="rounded border border-neutral-800 p-3 text-center">
          <p className="text-neutral-500">Survival</p>
          <p className="text-lg font-semibold">{report.survival_score.toFixed(0)}</p>
        </div>
        <div className="rounded border border-neutral-800 p-3 text-center">
          <p className="text-neutral-500">Risk Penalty</p>
          <p className="text-lg font-semibold text-red-400">-{report.risk_penalty.toFixed(0)}</p>
        </div>
      </div>

      <h2 className="mb-2 mt-8 text-sm font-semibold uppercase text-neutral-500">Quarter by Quarter</h2>
      <div className="flex flex-col gap-2">
        {report.narratives.map((n) => (
          <div key={n.quarter} className="rounded border border-neutral-800 bg-neutral-950 p-3">
            <p className="text-xs text-neutral-500">Quarter {n.quarter}</p>
            <p className="text-sm text-neutral-300">{n.narrative}</p>
          </div>
        ))}
      </div>
    </div>
  );
}