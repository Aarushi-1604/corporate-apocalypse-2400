"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FigmaCityMap } from "@/components/domain/FigmaCityMap";
import { WorldTourTutorial } from "@/components/domain/WorldTourTutorial";
import { useSession } from "@/lib/hooks/use-session";
import { useDepartmentLocks } from "@/lib/hooks/use-company-state";

export default function CityPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();
  const { data: deptLocks } = useDepartmentLocks(session?.company_id);

  useEffect(() => {
    if (!isLoading && (!session || isError)) {
      router.replace("/login");
    } else if (!isLoading && session?.status === "bankrupt") {
      router.replace("/bankruptcy");
    }
  }, [session, isLoading, isError, router]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest">
        INITIALIZING SATELLITE TELEMETRY // NEW KALKI CITY...
      </div>
    );
  }

  return (
    <>
      <FigmaCityMap
        data={session}
        onEnterHQ={() => {
          router.push("/hq");
        }}
        onVisitClient={() => {
          router.push("/hq/clients");
        }}
        onVisitPress={() => {
          router.push("/hq/press");
        }}
        departmentLocks={deptLocks}
      />
      <WorldTourTutorial
        companyId={session.company_id}
        quarter={session.current_quarter ?? 1}
      />
    </>
  );
}
