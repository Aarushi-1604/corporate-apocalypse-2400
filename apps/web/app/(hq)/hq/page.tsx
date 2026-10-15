"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { FigmaHQMap } from "@/components/domain/FigmaHQMap";
import { useSession } from "@/lib/hooks/use-session";
import { useActiveBoard } from "@/lib/hooks/use-active-board";
import { useDepartmentLocks } from "@/lib/hooks/use-company-state";

export default function HQPage() {
  const router = useRouter();
  const { data: session, isLoading, isError } = useSession();
  const { data: activeBoard } = useActiveBoard(session?.company_id);
  const { data: deptLocks } = useDepartmentLocks(session?.company_id);

  useEffect(() => {
    if (!isLoading && (!session || isError)) {
      router.replace("/login");
    }
  }, [session, isLoading, isError, router]);

  if (isLoading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest">
        CONNECTING TO HEADQUARTERS COMMAND CORE...
      </div>
    );
  }

  const isBankrupt =
    session?.status === "bankrupt" ||
    deptLocks?.session_status === "bankrupt" ||
    (session?.company?.cash ?? 0) < 0;

  return (
    <FigmaHQMap
      data={session}
      onBack={() => {
        router.push("/city");
      }}
      onEnterFinance={() => {
        if (isBankrupt) return;
        const q = session?.current_quarter ?? 1;
        if (q > 1 || deptLocks?.operations?.locked) {
          router.push("/hq/operations");
        } else {
          router.push("/hq/operations/training");
        }
      }}
      onEnterMarketing={() => {
        if (isBankrupt) return;
        router.push("/hq/market");
      }}
      onEnterResearch={() => {
        if (isBankrupt) return;
        router.push("/hq/rd");
      }}
      onEnterBoard={() => {
        if (isBankrupt) return;
        router.push("/hq/board");
      }}
      boardUnlocked={
        Boolean(activeBoard) ||
        Boolean(
          (session?.current_quarter ?? 1) <= 2
            ? deptLocks?.operations?.locked &&
              deptLocks?.market?.locked &&
              deptLocks?.rd?.locked &&
              deptLocks?.client?.locked &&
              deptLocks?.press?.locked
            : deptLocks?.operations?.locked &&
              deptLocks?.market?.locked &&
              deptLocks?.rd?.locked
        )
      }
      departmentLocks={deptLocks}
    />
  );
}
