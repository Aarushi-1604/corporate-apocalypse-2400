"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FigmaCityMap } from "@/components/domain/FigmaCityMap";
import { useSession } from "@/lib/hooks/use-session";

export default function CityPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || isError)) {
      router.replace("/login");
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
    <FigmaCityMap
      data={session}
      onEnterHQ={() => {
        router.push("/hq");
      }}
      onVisitClient={() => {
        router.push("/hq/clients");
      }}
      onVisitPress={() => {
        router.push("/hq/reports/corporate-times");
      }}
    />
  );
}
