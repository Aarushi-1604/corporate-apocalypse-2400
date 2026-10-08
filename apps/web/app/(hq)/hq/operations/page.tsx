"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/hooks/use-session";
import { ActualOperationsScreen } from "@/components/domain/ActualOperationsScreen";

export default function OperationsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session, isLoading, isError } = useSession();

  useEffect(() => {
    if (!isLoading && (!session || isError)) {
      router.replace("/login");
    }
  }, [session, isLoading, isError, router]);

  const handleBackToHQ = () => {
    router.push("/hq");
  };

  const handleLockComplete = async () => {
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    router.push("/hq");
  };

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest">
        ESTABLISHING SECURE PROTOCOL // OPERATIONS COMMAND...
      </div>
    );
  }

  return (
    <ActualOperationsScreen
      sessionData={session}
      onBack={handleBackToHQ}
      onLockComplete={handleLockComplete}
    />
  );
}