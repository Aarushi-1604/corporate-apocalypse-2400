"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const DEPARTMENTS = [
  { href: "/hq/executive", label: "Executive Office" },
  { href: "/hq/operations", label: "Operations" },
  { href: "/hq/employees", label: "Employees" },
  { href: "/hq/clients", label: "Clients" },
  { href: "/hq/market", label: "Market" },
  { href: "/hq/board", label: "Board Room" },
  { href: "/hq/advisor", label: "AI Advisor" },
  { href: "/hq/leaderboard", label: "Leaderboard" },
  { href: "/hq/settings", label: "Settings" },
];

export function LeftRail() {
  const pathname = usePathname();

  return (
    <nav className="flex w-56 flex-col gap-1 border-r border-neutral-800 bg-neutral-950 p-4">
      {DEPARTMENTS.map((dept) => {
        const isActive = pathname === dept.href;
        return (
          <Link
            key={dept.href}
            href={dept.href}
            className={`rounded px-3 py-2 text-sm ${
              isActive ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
            }`}
          >
            {dept.label}
          </Link>
        );
      })}
    </nav>
  );
}