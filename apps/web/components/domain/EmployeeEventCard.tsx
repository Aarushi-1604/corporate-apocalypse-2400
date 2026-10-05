"use client";

import { type EmployeeFeedItem } from "@/lib/hooks/use-employee-feed";
import { HrDossierMessengerGame } from "@/components/minigames/HrDossierMessengerGame";

export function EmployeeEventCard({ item, companyId }: { item: EmployeeFeedItem; companyId: string }) {
  return <HrDossierMessengerGame item={item} companyId={companyId} />;
}