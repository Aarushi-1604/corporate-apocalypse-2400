"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useCompanyState } from "@/lib/hooks/use-company-state";
import { KpiCard } from "@/components/domain/KpiCard";
import { TrendChart } from "@/components/domain/TrendChart";
import { HQHub } from "@/components/domain/HQHub";

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
    <div className="space-y-8">
      {/* Interactive Command Hub Station Map */}
      <HQHub />

      <div className="border-t border-neutral-800 pt-6">
        <h2 className="mb-4 text-xl font-bold text-white flex items-center gap-2">
          <span>Executive Telemetry & Metrics</span>
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiCard label="Cash" value={(state.cash ?? 0).toFixed(0)} delta={delta("cash")} previousValue={prevState?.cash != null ? prevState.cash.toFixed(0) : undefined} />
          <KpiCard label="Revenue" value={(state.revenue ?? 0).toFixed(0)} delta={delta("revenue")} previousValue={prevState?.revenue != null ? prevState.revenue.toFixed(0) : undefined} />
          <KpiCard label="Profit" value={(state.profit ?? 0).toFixed(0)} delta={delta("profit")} previousValue={prevState?.profit != null ? prevState.profit.toFixed(0) : undefined} />
          <KpiCard label="Debt" value={(state.debt ?? 0).toFixed(0)} delta={delta("debt")} previousValue={prevState?.debt != null ? prevState.debt.toFixed(0) : undefined} />
          <KpiCard label="Stock Price" value={(state.stock_price ?? 0).toFixed(2)} delta={delta("stock_price")} previousValue={prevState?.stock_price != null ? prevState.stock_price.toFixed(2) : undefined} />
          <KpiCard label="Employees" value={state.employees ?? 0} delta={delta("employees")} previousValue={prevState?.employees} />
          <KpiCard label="Innovation" value={(state.innovation ?? 0).toFixed(1)} delta={delta("innovation")} previousValue={prevState?.innovation != null ? prevState.innovation.toFixed(1) : undefined} />
          <KpiCard label="Brand" value={(state.brand ?? 0).toFixed(1)} delta={delta("brand")} previousValue={prevState?.brand != null ? prevState.brand.toFixed(1) : undefined} />
          <KpiCard label="Client Satisfaction" value={(state.client_satisfaction ?? 0).toFixed(1)} delta={delta("client_satisfaction")} previousValue={prevState?.client_satisfaction != null ? prevState.client_satisfaction.toFixed(1) : undefined} />
          <KpiCard label="Employee Satisfaction" value={(state.employee_satisfaction ?? 0).toFixed(1)} delta={delta("employee_satisfaction")} previousValue={prevState?.employee_satisfaction != null ? prevState.employee_satisfaction.toFixed(1) : undefined} />
          <KpiCard label="Investor Confidence" value={(state.investor_confidence ?? 0).toFixed(1)} delta={delta("investor_confidence")} previousValue={prevState?.investor_confidence != null ? prevState.investor_confidence.toFixed(1) : undefined} />
          <KpiCard label="ESG" value={(state.esg ?? 0).toFixed(1)} delta={delta("esg")} previousValue={prevState?.esg != null ? prevState.esg.toFixed(1) : undefined} />
          <KpiCard label="Risk" value={(state.risk ?? 0).toFixed(1)} delta={delta("risk")} previousValue={prevState?.risk != null ? prevState.risk.toFixed(1) : undefined} />
          <KpiCard label="Market Share" value={(state.market_share ?? 0).toFixed(1)} delta={delta("market_share")} previousValue={prevState?.market_share != null ? prevState.market_share.toFixed(1) : undefined} />
          <KpiCard label="Board Confidence" value={(state.board_confidence ?? 0).toFixed(1)} delta={delta("board_confidence")} previousValue={prevState?.board_confidence != null ? prevState.board_confidence.toFixed(1) : undefined} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <TrendChart label="Revenue" data={[{ quarter: `Q${quarter}`, value: state.revenue }]} />
          <TrendChart label="Stock Price" data={[{ quarter: `Q${quarter}`, value: state.stock_price }]} />
        </div>
      </div>
    </div>
  );
}