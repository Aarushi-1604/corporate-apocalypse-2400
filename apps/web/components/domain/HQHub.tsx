"use client";

import { useState } from "react";
import Link from "next/link";
import { soundManager } from "@/lib/audio";
import { useSession } from "@/lib/hooks/use-session";
import { useActiveEvent } from "@/lib/hooks/use-active-event";
import {
  Building2,
  Sliders,
  Users,
  Briefcase,
  TrendingUp,
  Landmark,
  Bot,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
} from "lucide-react";

export function HQHub() {
  const { data: session } = useSession();
  const { data: activeEvent } = useActiveEvent(session?.company_id);
  const [hoveredDept, setHoveredDept] = useState<string | null>(null);

  const departments = [
    {
      id: "executive",
      name: "Executive Suite",
      description: "CEO Command overview, performance stats, corporate directives.",
      href: "/hq/executive",
      icon: Building2,
      color: "from-blue-600/20 to-cyan-600/20 border-cyan-500/40 text-cyan-400",
      badge: "HQ Hub",
    },
    {
      id: "operations",
      name: "Operations Grid",
      description: "Resource allocation reactor: R&D, Marketing, HR, Ops, Cybersecurity.",
      href: "/hq/operations",
      icon: Sliders,
      color: "from-emerald-600/20 to-teal-600/20 border-emerald-500/40 text-emerald-400",
      badge: session?.company?.cash ? `\$${session.company.cash.toLocaleString()}` : "Budget Active",
    },
    {
      id: "employees",
      name: "HR & Talent Terminal",
      description: "Review personnel cases, employee morale, and whistleblower reports.",
      href: "/hq/employees",
      icon: Users,
      color: "from-purple-600/20 to-indigo-600/20 border-purple-500/40 text-purple-400",
      badge: "Personnel",
    },
    {
      id: "clients",
      name: "Dealmaker Suite",
      description: "Client contract negotiations: Price vs Trust trade-off dial.",
      href: "/hq/clients",
      icon: Briefcase,
      color: "from-amber-600/20 to-orange-600/20 border-amber-500/40 text-amber-400",
      badge: "Negotiate",
    },
    {
      id: "market",
      name: "Market Intel Room",
      description: "Macro-economic snapshot, competitor stats, industry trends.",
      href: "/hq/market",
      icon: TrendingUp,
      color: "from-sky-600/20 to-blue-600/20 border-sky-500/40 text-sky-400",
      badge: "Live Data",
    },
    {
      id: "board",
      name: "Board Room Hot Seat",
      description: "Quarterly review with 6 Board members: Survival confidence check.",
      href: "/hq/board",
      icon: Landmark,
      color: "from-rose-600/20 to-red-600/20 border-rose-500/40 text-rose-400",
      badge: "High Stakes",
    },
  ];

  const handleTileHover = (deptId: string) => {
    setHoveredDept(deptId);
    soundManager.playHover();
  };

  const handleTileClick = () => {
    soundManager.playClick();
  };

  return (
    <div className="space-y-6">
      {/* Top Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-900/50 bg-gradient-to-r from-neutral-950 via-cyan-950/30 to-neutral-950 p-6 shadow-2xl">
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-cyan-950 px-3 py-1 text-xs font-mono text-cyan-400 border border-cyan-700/50">
                <Zap className="h-3 w-3 animate-pulse" /> Cyber Command Hub 2400
              </span>
              <span className="text-xs font-mono text-neutral-400">
                Quarter {session?.current_quarter ?? 1} / 4
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {session?.company?.name || "Corporate Enterprise"}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Sector: <span className="text-neutral-200">{session?.company?.sector || "Tech conglomerate"}</span> | CEO Authority Active
            </p>
          </div>

          {/* Quick Alert Indicator */}
          {activeEvent && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-500/60 bg-rose-950/40 p-4 animate-pulse">
              <AlertTriangle className="h-6 w-6 text-rose-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                  URGENT CRISIS DETECTED
                </div>
                <div className="text-xs text-rose-200">
                  {activeEvent.title}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HQ Interactive Hotspot Map Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {departments.map((dept) => {
          const IconComponent = dept.icon;
          const isHovered = hoveredDept === dept.id;

          return (
            <Link
              key={dept.id}
              href={dept.href}
              onMouseEnter={() => handleTileHover(dept.id)}
              onClick={handleTileClick}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-gradient-to-br p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl ${dept.color}`}
            >
              {/* Hotspot Pulse Node */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900/80 border border-neutral-700/60 group-hover:border-cyan-400 transition">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-white text-base group-hover:text-cyan-300 transition">
                    {dept.name}
                  </h3>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-neutral-900/80 text-neutral-300 border border-neutral-700/50">
                  {dept.badge}
                </span>
              </div>

              <p className="text-xs text-neutral-300 leading-relaxed mb-4">
                {dept.description}
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/60 text-xs font-semibold text-neutral-400 group-hover:text-white transition">
                <span>Enter Station</span>
                <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Auxiliary Command Station Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/hq/advisor"
          onClick={handleTileClick}
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 hover:border-cyan-500/50 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">AI Advisor & Dictionary</h4>
            <p className="text-xs text-neutral-400">Ask business terminology & strategies</p>
          </div>
        </Link>

        <Link
          href="/hq/reports/corporate-times"
          onClick={handleTileClick}
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 hover:border-emerald-500/50 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Corporate Times Newspaper</h4>
            <p className="text-xs text-neutral-400">Quarterly media recap & sector news</p>
          </div>
        </Link>

        <Link
          href="/hq/leaderboard"
          onClick={handleTileClick}
          className="flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/60 p-4 hover:border-purple-500/50 transition group"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-950 text-purple-400 border border-purple-800">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white group-hover:text-purple-300 transition">Live Leaderboard</h4>
            <p className="text-xs text-neutral-400">Realtime standings across competitors</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
