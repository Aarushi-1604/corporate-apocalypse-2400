"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { HqShell } from "@/components/layout/HqShell";
import { useSession } from "@/lib/hooks/use-session";

// Fullscreen 2400 routes render without the legacy LeftRail shell
const FULLSCREEN_ROUTES = [
  "/hq",
  "/hq/operations",
  "/hq/operations/training",
  "/hq/market",
  "/hq/rd",
  "/hq/clients",
  "/hq/press",
  "/hq/board",
  "/hq/leaderboard",
];

export default function HqLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isLoading } = useSession();

  const isBankrupt = session?.status === "bankrupt";

  useEffect(() => {
    if (!isLoading && isBankrupt) {
      // Allow viewing final audit / annual report or leaderboard
      if (pathname !== "/hq/reports/annual" && pathname !== "/hq/leaderboard") {
        router.replace("/bankruptcy");
      }
    }
  }, [isBankrupt, isLoading, pathname, router]);

  const isFullscreen = FULLSCREEN_ROUTES.some(
    (route) => pathname === route || (route !== "/hq" && pathname.startsWith(route + "/"))
  );

  if (isFullscreen) {
    return <>{children}</>;
  }

  return <HqShell>{children}</HqShell>;
}