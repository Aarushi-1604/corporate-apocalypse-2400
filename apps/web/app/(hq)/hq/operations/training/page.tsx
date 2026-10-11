"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DiminishingReturnsTrainingReactor } from "@/components/domain/DiminishingReturnsTrainingReactor";
import { useSession } from "@/lib/hooks/use-session";
import { useDepartmentLocks } from "@/lib/hooks/use-company-state";

export default function TrainingReactorPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();
  const { data: deptLocks, isLoading: isLocksLoading } = useDepartmentLocks(session?.company_id);

  useEffect(() => {
    if (!isLoading && (!session || isError)) {
      router.replace("/login");
    }
  }, [session, isLoading, isError, router]);

  useEffect(() => {
    if (deptLocks?.operations?.locked) {
      router.replace("/hq/operations");
    }
  }, [deptLocks, router]);

  if (isLoading || isLocksLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest">
        INITIALIZING NEURAL FINANCE TRAINING PROTOCOL...
      </div>
    );
  }


  const handleComplete = () => {
    // Flag this quarter's training simulation as cleared in localStorage
    if (session.company_id && session.current_quarter) {
      const key = `diminishing_returns_demo_completed_${session.company_id}_q${session.current_quarter}`;
      try {
        localStorage.setItem(key, "true");
      } catch {
        // Ignore storage exceptions if private mode
      }
    }
    router.push("/hq/operations");
  };

  return (
    <DiminishingReturnsTrainingReactor
      data={session}
      onBack={() => {
        router.push("/hq");
      }}
      onComplete={handleComplete}
    />
  );
}
