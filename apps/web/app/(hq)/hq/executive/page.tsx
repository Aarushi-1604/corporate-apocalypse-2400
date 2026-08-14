"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useCompanyState } from "@/lib/hooks/use-company-state";
import { KpiCard } from "@/components/domain/KpiCard";
import { TrendChart } from "@/components/domain/TrendChart";

export default function ExecutiveOfficePage() {
  const { data: session } = useSession();
  const { data: state, isLoading, isError } = useCompanyState(session?.company_id, session?.current_quarter ?? 1);

  if (isLoading) return <p className="text-neutral-400">Loading company data...</p>;
  if (isError || !state) return <p className="text-red-500">Failed to load company data.</p>;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Executive Office</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Cash" value={state.cash.toFixed(0)} />
        <KpiCard label="Revenue" value={state.revenue.toFixed(0)} />
        <KpiCard label="Profit" value={state.profit.toFixed(0)} />
        <KpiCard label="Debt" value={state.debt.toFixed(0)} />
        <KpiCard label="Stock Price" value={state.stock_price.toFixed(2)} />
        <KpiCard label="Employees" value={state.employees} />
        <KpiCard label="Innovation" value={state.innovation.toFixed(1)} />
        <KpiCard label="Brand" value={state.brand.toFixed(1)} />
        <KpiCard label="Client Satisfaction" value={state.client_satisfaction.toFixed(1)} />
        <KpiCard label="Employee Satisfaction" value={state.employee_satisfaction.toFixed(1)} />
        <KpiCard label="Investor Confidence" value={state.investor_confidence.toFixed(1)} />
        <KpiCard label="ESG" value={state.esg.toFixed(1)} />
        <KpiCard label="Risk" value={state.risk.toFixed(1)} />
        <KpiCard label="Market Share" value={state.market_share.toFixed(1)} />
        <KpiCard label="Board Confidence" value={state.board_confidence.toFixed(1)} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrendChart label="Revenue" data={[{ quarter: "Q1", value: state.revenue }]} />
        <TrendChart label="Stock Price" data={[{ quarter: "Q1", value: state.stock_price }]} />
      </div>
    </div>
  );
}