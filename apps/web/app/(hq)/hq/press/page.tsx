"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";
import { usePressSession } from "@/lib/hooks/use-press";
import { PressWorldScreen } from "@/components/domain/PressWorldScreen";

export default function PressConferencePage() {
  const router = useRouter();
  const { data: session, isLoading: sessionLoading, isError: sessionError } = useSession();
  const {
    data: pressData,
    isLoading: pressLoading,
    isError: pressIsError,
    error: pressErrorObject,
  } = usePressSession(session?.company_id);

  useEffect(() => {
    if (!sessionLoading && (!session || sessionError)) {
      router.replace("/login");
    }
  }, [session, sessionLoading, sessionError, router]);

  if (sessionLoading || pressLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-red-500 font-mono tracking-widest">
        INITIALIZING BROADCAST SATELLITE FEED // NEW KALKI PRESS CORPS...
      </div>
    );
  }

  if (!session || !pressData || pressIsError) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-black text-red-500 font-mono gap-4 p-8 text-center">
        <p>FAILED TO CONNECT TO NEW KALKI BROADCAST CORE</p>
        {pressErrorObject && (
          <p className="text-xs text-neutral-400 max-w-lg">
            {pressErrorObject.message || "Unknown error"}
          </p>
        )}
        <div className="flex gap-4 mt-2">
          <button
            onClick={() => window.location.reload()}
            className="border border-amber-500 text-amber-400 px-4 py-2 hover:bg-amber-950/40 text-sm tracking-wider"
          >
            RECONNECT SATELLITE
          </button>
          <button
            onClick={() => router.push("/hq")}
            className="border border-red-500 px-4 py-2 hover:bg-red-950/40 text-sm tracking-wider"
          >
            RETURN TO HEADQUARTERS
          </button>
        </div>
      </div>
    );
  }

  return (
    <PressWorldScreen
      session={session}
      pressData={pressData}
      onReturnToHQ={() => router.push("/hq")}
      onReturnToCity={() => router.push("/city")}
    />
  );
}
