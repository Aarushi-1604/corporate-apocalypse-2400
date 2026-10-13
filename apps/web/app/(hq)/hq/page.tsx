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

  return (
    <FigmaHQMap
      data={session}
      onBack={() => {
        router.push("/city");
      }}
      onEnterFinance={() => {
        if (deptLocks?.operations?.locked) {
          router.push("/hq/operations");
        } else {
          router.push("/hq/operations/training");
        }
      }}
      onEnterMarketing={() => {
        router.push("/hq/market");
      }}
      onEnterResearch={() => {
        router.push("/hq/rd");
      }}
      onEnterBoard={() => {
        router.push("/hq/board");
      }}
      boardUnlocked={
        Boolean(activeBoard) ||
        Boolean(
          deptLocks?.operations?.locked &&
          deptLocks?.market?.locked &&
          deptLocks?.rd?.locked &&
          deptLocks?.client?.locked &&
          deptLocks?.press?.locked
        )
      }
      departmentLocks={deptLocks}
    />
  );
}
