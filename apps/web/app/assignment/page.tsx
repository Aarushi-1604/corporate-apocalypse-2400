"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FigmaAssignment } from "@/components/domain/FigmaAssignment";
import { useSession } from "@/lib/hooks/use-session";

export default function AssignmentPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();

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
        VERIFYING EXECUTIVE APPOINTMENT PROTOCOL...
      </div>
    );
  }

  return (
    <FigmaAssignment
      data={session}
      onAccept={() => {
        router.push("/city");
      }}
    />
  );
}
