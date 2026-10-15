"use client";

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { soundManager } from "@/lib/audio";

// -----------------------------------------------------------------------------
// Types & Interfaces
// -----------------------------------------------------------------------------

export interface TrainingSector {
  id: string;
  name: string;
  system: string;
  profile: string;
  maxOutput: number;
  k: number; // Saturation rate (higher = saturates faster)
  color: string;
  iconType: "marketing" | "flask" | "lock" | "pulse" | "building";
}

export interface TrainingRoundConfig {
  roundNumber: number;
  title: string;
  story: string;
  units: number;
  seconds: number;
  sectors: TrainingSector[];
}

export const UNIT_VALUE = 25000;
export const PASS_THRESHOLD = 75; // 75% allocative efficiency required to clear

// -----------------------------------------------------------------------------
// 3-Round Scalable Data Structure
// -----------------------------------------------------------------------------

export const TRAINING_ROUNDS: TrainingRoundConfig[] = [
  // ROUND 01: 3 Sectors, 6 Units (₹1,50,000)
  {
    roundNumber: 1,
    title: "ROUND 01 // TRI-SECTOR FOUNDATION",
    story: "Distribute 6 capital units (₹1,50,000). Watch the marginal output meters as you feed capital into different sectors.",
    units: 6,
    seconds: 45,
    sectors: [
      {
        id: "marketing",
        name: "MARKETING",
        system: "BRAND BLITZ",
        profile: "FAST SATURATION",
        maxOutput: 95,
        k: 0.65,
        color: "#f59e0b",
        iconType: "marketing",
      },
      {
        id: "rnd",
        name: "R&D",
        system: "INNOVATION LAB",
        profile: "SLOW BURN // HIGH CEILING",
        maxOutput: 110,
        k: 0.22,
        color: "#72d9ea",
        iconType: "flask",
      },
      {
        id: "cybersecurity",
        name: "CYBERSECURITY",
        system: "DEFENSIVE SHIELD",
        profile: "STEADY MODERATE RETURNS",
        maxOutput: 80,
        k: 0.35,
        color: "#10b981",
        iconType: "lock",
      },
    ],
  },

  // ROUND 02: 6 Sectors, 10 Units (₹2,50,000)
  {
    roundNumber: 2,
    title: "ROUND 02 // HEX-SECTOR DIVERSIFICATION",
    story: "Distribute 10 units (₹2,50,000) across 6 sectors. Notice the high-first-dollar traps vs durable infrastructure.",
    units: 10,
    seconds: 60,
    sectors: [
      {
        id: "marketing",
        name: "MARKETING",
        system: "BRAND BLITZ",
        profile: "FAST SATURATION",
        maxOutput: 95,
        k: 0.65,
        color: "#f59e0b",
        iconType: "marketing",
      },
      {
        id: "rnd",
        name: "R&D",
        system: "INNOVATION LAB",
        profile: "SLOW BURN // HIGH CEILING",
        maxOutput: 110,
        k: 0.22,
        color: "#72d9ea",
        iconType: "flask",
      },
      {
        id: "cybersecurity",
        name: "CYBERSECURITY",
        system: "DEFENSIVE SHIELD",
        profile: "STEADY MODERATE RETURNS",
        maxOutput: 80,
        k: 0.35,
        color: "#10b981",
        iconType: "lock",
      },
      {
        id: "automation",
        name: "AUTOMATION",
        system: "OPERATIONS CORE",
        profile: "LATE-STAGE ACCELERATION",
        maxOutput: 105,
        k: 0.18,
        color: "#3b82f6",
        iconType: "pulse",
      },
      {
        id: "talent",
        name: "TALENT & HR",
        system: "EXECUTIVE RETENTION",
        profile: "MODERATE // DURABLE",
        maxOutput: 85,
        k: 0.3,
        color: "#a855f7",
        iconType: "building",
      },
      {
        id: "legal",
        name: "LEGAL SHIELD",
        system: "REGULATORY COMPLIANCE",
        profile: "QUICK SATURATION CEILING",
        maxOutput: 50,
        k: 0.55,
        color: "#f43f5e",
        iconType: "lock",
      },
    ],
  },

  // ROUND 03: 10 Sectors, 15 Units (₹3,75,000)
  {
    roundNumber: 3,
    title: "ROUND 03 // FULL ENTERPRISE MATRIX",
    story: "Final assessment: 10 corporate sectors, 15 units (₹3,75,000). Balance marginal yields across competing branches before the timer expires.",
    units: 15,
    seconds: 75,
    sectors: [
      {
        id: "marketing",
        name: "MARKETING",
        system: "BRAND BLITZ",
        profile: "FAST SATURATION",
        maxOutput: 95,
        k: 0.65,
        color: "#f59e0b",
        iconType: "marketing",
      },
      {
        id: "rnd",
        name: "R&D",
        system: "INNOVATION LAB",
        profile: "SLOW BURN // HIGH CEILING",
        maxOutput: 110,
        k: 0.22,
        color: "#72d9ea",
        iconType: "flask",
      },
      {
        id: "cybersecurity",
        name: "CYBERSECURITY",
        system: "DEFENSIVE SHIELD",
        profile: "STEADY RETURNS",
        maxOutput: 80,
        k: 0.35,
        color: "#10b981",
        iconType: "lock",
      },
      {
        id: "automation",
        name: "AUTOMATION",
        system: "OPERATIONS CORE",
        profile: "LATE ACCELERATION",
        maxOutput: 105,
        k: 0.18,
        color: "#3b82f6",
        iconType: "pulse",
      },
      {
        id: "talent",
        name: "TALENT & HR",
        system: "EXECUTIVE RETENTION",
        profile: "MODERATE // DURABLE",
        maxOutput: 85,
        k: 0.3,
        color: "#a855f7",
        iconType: "building",
      },
      {
        id: "legal",
        name: "LEGAL SHIELD",
        system: "REGULATORY DEFENSE",
        profile: "SHALLOW CEILING",
        maxOutput: 50,
        k: 0.55,
        color: "#f43f5e",
        iconType: "lock",
      },
      {
        id: "expansion",
        name: "EXPANSION",
        system: "NEW REGIONAL OFFICES",
        profile: "HIGH EARLY GAIN // RAPID DROP",
        maxOutput: 100,
        k: 0.48,
        color: "#06b6d4",
        iconType: "building",
      },
      {
        id: "supply_chain",
        name: "SUPPLY CHAIN",
        system: "LOGISTICS GRID",
        profile: "STEADY COMPOUNDER",
        maxOutput: 90,
        k: 0.25,
        color: "#14b8a6",
        iconType: "pulse",
      },
      {
        id: "acquisitions",
        name: "M&A DEALS",
        system: "VENTURE ROLLUPS",
        profile: "HIGH RISK // ASYMMETRIC",
        maxOutput: 115,
        k: 0.2,
        color: "#eab308",
        iconType: "building",
      },
      {
        id: "patents",
        name: "PATENTS",
        system: "IP MONOPOLIES",
        profile: "EXTENDED GENTLE CURVE",
        maxOutput: 98,
        k: 0.28,
        color: "#8b5cf6",
        iconType: "flask",
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// Mathematical Model: Diminishing Returns & Marginal Yield
// -----------------------------------------------------------------------------

export function sectorOutput(sector: TrainingSector, units: number): number {
  if (units <= 0) return 0;
  return sector.maxOutput * (1 - Math.exp(-sector.k * units));
}

export function sectorMarginal(sector: TrainingSector, currentUnits: number): number {
  return sectorOutput(sector, currentUnits + 1) - sectorOutput(sector, currentUnits);
}

export function optimalTheoreticalOutput(round: TrainingRoundConfig): number {
  const alloc = new Array(round.sectors.length).fill(0);
  for (let u = 0; u < round.units; u++) {
    let bestIdx = 0;
    let bestMarginal = -1;
    for (let i = 0; i < round.sectors.length; i++) {
      const m = sectorMarginal(round.sectors[i], alloc[i]);
      if (m > bestMarginal) {
        bestMarginal = m;
        bestIdx = i;
      }
    }
    alloc[bestIdx]++;
  }
  return alloc.reduce((sum, count, idx) => sum + sectorOutput(round.sectors[idx], count), 0);
}

export function calculateRoundEfficiency(round: TrainingRoundConfig, allocations: number[]): number {
  const actualOutput = allocations.reduce((sum, count, idx) => sum + sectorOutput(round.sectors[idx], count), 0);
  const maxPossible = optimalTheoreticalOutput(round);
  if (maxPossible <= 0) return 0;
  return Math.min(100, Math.round((actualOutput / maxPossible) * 100));
}
