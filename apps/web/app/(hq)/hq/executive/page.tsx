"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useCompanyState } from "@/lib/hooks/use-company-state";
import { KpiCard } from "@/components/domain/KpiCard";
import { TrendChart } from "@/components/domain/TrendChart";

const NUMERIC_KEYS = [
  "cash", "revenue", "profit", "debt", "stock_price", "employees",
  "innovation", "brand", "client_satisfaction", "employee_satisfaction",
  "investor_confidence", "esg", "risk", "market_share", "board_confidence",
] as const;

export default function ExecutiveOfficePage() {
  const { data: session } = useSession();
  const quarter = session?.current_quarter ?? 1;

  const { data: state, isLoading, isError } = useCompanyState(session?.company_id, quarter);
  const { data: prevState } = useCompanyState(
    session?.company_id,
    quarter > 1 ? quarter - 1 : undefined
  );

  if (isLoading) return <p className="text-neutral-400">Loading company data...</p>;
  if (isError || !state) return <p className="text-red-500">Failed to load company data.</p>;

  function delta(key: (typeof NUMERIC_KEYS)[number]) {
    if (!prevState) return undefined;
    return state![key] - prevState[key];
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Executive Office</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <KpiCard label="Cash" value={state.cash.toFixed(0)} delta={delta("cash")} />
        <KpiCard label="Revenue" value={state.revenue.toFixed(0)} delta={delta("revenue")} />
        <KpiCard label="Profit" value={state.profit.toFixed(0)} delta={delta("profit")} />
        <KpiCard label="Debt" value={state.debt.toFixed(0)} delta={delta("debt")} />
        <KpiCard label="Stock Price" value={state.stock_price.toFixed(2)} delta={delta("stock_price")} />
        <KpiCard label="Employees" value={state.employees} delta={delta("employees")} />
        <KpiCard label="Innovation" value={state.innovation.toFixed(1)} delta={delta("innovation")} />
        <KpiCard label="Brand" value={state.brand.toFixed(1)} delta={delta("brand")} />
        <KpiCard label="Client Satisfaction" value={state.client_satisfaction.toFixed(1)} delta={delta("client_satisfaction")} />
        <KpiCard label="Employee Satisfaction" value={state.employee_satisfaction.toFixed(1)} delta={delta("employee_satisfaction")} />
        <KpiCard label="Investor Confidence" value={state.investor_confidence.toFixed(1)} delta={delta("investor_confidence")} />
        <KpiCard label="ESG" value={state.esg.toFixed(1)} delta={delta("esg")} />
        <KpiCard label="Risk" value={state.risk.toFixed(1)} delta={delta("risk")} />
        <KpiCard label="Market Share" value={state.market_share.toFixed(1)} delta={delta("market_share")} />
        <KpiCard label="Board Confidence" value={state.board_confidence.toFixed(1)} delta={delta("board_confidence")} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <TrendChart label="Revenue" data={[{ quarter: `Q${quarter}`, value: state.revenue }]} />
        <TrendChart label="Stock Price" data={[{ quarter: `Q${quarter}`, value: state.stock_price }]} />
      </div>
    </div>
  );
}