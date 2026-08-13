"use client";

import { useSession } from "@/lib/hooks/use-session";
import { LeftRail } from "./LeftRail";
import { TopStatusBar } from "./TopStatusBar";
import { OverlayPortal } from "./OverlayPortal";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function HqShell({ children }: { children: React.ReactNode }) {
  const { data, isLoading, isError } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isError) {
      router.replace("/");
    }
  }, [isLoading, isError, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Loading Headquarters...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="flex min-h-screen bg-black text-white">
      <LeftRail />
      <div className="flex flex-1 flex-col">
        <TopStatusBar />
        <main className="flex-1 p-8">{children}</main>
      </div>
      <OverlayPortal />
    </div>
  );
}