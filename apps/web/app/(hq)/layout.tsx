"use client";

import { usePathname } from "next/navigation";
import { HqShell } from "@/components/layout/HqShell";

// Fullscreen 2400 routes render without the legacy LeftRail shell
const FULLSCREEN_ROUTES = [
  "/hq",
  "/hq/operations",
  "/hq/operations/training",
];

export default function HqLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isFullscreen = FULLSCREEN_ROUTES.includes(pathname);

  if (isFullscreen) {
    return <>{children}</>;
  }

  return <HqShell>{children}</HqShell>;
}