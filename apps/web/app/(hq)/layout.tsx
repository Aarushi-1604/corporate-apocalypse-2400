"use client";

import { usePathname } from "next/navigation";
import { HqShell } from "@/components/layout/HqShell";

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

  const isFullscreen = FULLSCREEN_ROUTES.some(
    (route) => pathname === route || (route !== "/hq" && pathname.startsWith(route + "/"))
  );

  if (isFullscreen) {
    return <>{children}</>;
  }

  return <HqShell>{children}</HqShell>;
}