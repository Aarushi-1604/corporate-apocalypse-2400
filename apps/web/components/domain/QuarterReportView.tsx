"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useQuarterReport } from "@/lib/hooks/use-reports";

export function QuarterReportView({ quarter }: { quarter: number }) {
  const { data: session } = useSession();
  const { data: report, isLoading, isError } = useQuarterReport(session?.company_id, quarter);

  if (isLoading) return <p className="text-neutral-400">Loading report...</p>;
  if (isError || !report) return <p className="text-red-500">No report available for Q{quarter}.</p>;

  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-bold">Quarter {report.quarter} Report</h1>
      <p className="mb-6 text-neutral-300">{report.narrative}</p>
      <div className="flex flex-col gap-2">
        {Object.entries(report.kpi_deltas).map(([metric, value]) => (
          <div key={metric} className="flex justify-between rounded border border-neutral-800 bg-neutral-950 p-3">
            <span className="capitalize text-neutral-400">{metric.replace("_", " ")}</span>
            <span className={value >= 0 ? "text-green-500" : "text-red-500"}>
              {value >= 0 ? "+" : ""}{value.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}