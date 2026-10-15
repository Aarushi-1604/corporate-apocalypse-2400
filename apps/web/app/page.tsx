"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/hooks/use-session";

export default function RootPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();

  useEffect(() => {
    if (isLoading) return;

    if (!session || isError) {
      // Unauthenticated -> /login
      router.replace("/login");
    } else if (!session.company) {
      // Authenticated but no company assigned yet -> /assignment
      router.replace("/assignment");
    } else {
      // Active player session -> /city
      router.replace("/city");
    }
  }, [session, isLoading, isError, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest text-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
        <span>RESOLVING APEX DYNAMICS SESSION TELEMETRY...</span>
      </div>
    </div>
  );
}