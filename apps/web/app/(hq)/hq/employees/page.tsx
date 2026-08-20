"use client";

import { useSession } from "@/lib/hooks/use-session";
import { useEmployeeFeed } from "@/lib/hooks/use-employee-feed";
import { useCompanyState } from "@/lib/hooks/use-company-state";
import { EmployeeEventCard } from "@/components/domain/EmployeeEventCard";

export default function EmployeesPage() {
  const { data: session } = useSession();
  const { data: state } = useCompanyState(session?.company_id, session?.current_quarter ?? 1);
  const { data: items, isLoading } = useEmployeeFeed(session?.company_id);

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Employee Portal</h1>
      <p className="mb-6 text-sm text-neutral-400">
        Employee Satisfaction: {state ? state.employee_satisfaction.toFixed(1) : "--"}
      </p>

      {isLoading && <p className="text-neutral-400">Loading feed...</p>}
      {!isLoading && items && items.length === 0 && (
        <p className="text-neutral-500">No employee matters yet this quarter.</p>
      )}

      <div className="flex flex-col gap-3">
        {items?.map((item) => (
          <EmployeeEventCard key={item.event_instance_id} item={item} companyId={session!.company_id} />
        ))}
      </div>
    </div>
  );
}