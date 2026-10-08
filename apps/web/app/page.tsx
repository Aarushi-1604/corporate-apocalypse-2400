"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { type RegisterResponse } from "@/lib/api/registration";
import { useSession } from "@/lib/hooks/use-session";
import { FigmaLogin } from "@/components/domain/FigmaLogin";
import { FigmaAssignment } from "@/components/domain/FigmaAssignment";
import { FigmaCityMap } from "@/components/domain/FigmaCityMap";
import { FigmaHQMap } from "@/components/domain/FigmaHQMap";
import { DiminishingReturnsTrainingReactor } from "@/components/domain/DiminishingReturnsTrainingReactor";
import { ActualOperationsScreen } from "@/components/domain/ActualOperationsScreen";
import { useActiveBoard } from "@/lib/hooks/use-active-board";

type Screen = "login" | "assignment" | "city_map" | "hq_map" | "finance" | "operations";

export default function Home() {
  const router = useRouter();
  const { data: existingSession, isLoading: isSessionLoading } = useSession();
  const [screen, setScreen] = useState<Screen>("login");
  const [sessionData, setSessionData] = useState<RegisterResponse | null>(null);

  // Check if Board meeting is active/unlocked
  const { data: activeBoard } = useActiveBoard(sessionData?.company_id ?? existingSession?.company_id);

  // If a player refreshes or already has an active session cookie, load their active session state
  useEffect(() => {
    if (existingSession && !sessionData) {
      setSessionData(existingSession);
      setScreen("city_map");
    }
  }, [existingSession, sessionData]);

  const handleLoginSuccess = (response: RegisterResponse) => {
    setSessionData(response);
    setScreen("assignment");
  };

  const handleAcceptAssignment = () => {
    setScreen("city_map");
  };

  // City Map -> 1. Enter Headquarters: transitions to Figma HQ Map
  const handleEnterHQ = () => {
    setScreen("hq_map");
  };

  // City Map -> 2. Visit Client Office: routes to Phase 23 Clients contract negotiation
  const handleVisitClient = () => {
    router.push("/hq/clients");
  };

  // City Map -> 3. Visit Press: routes to Phase 23 Corporate Times press edition
  const handleVisitPress = () => {
    router.push("/hq/reports/corporate-times");
  };

  // HQ Map -> Back button: returns to City Map
  const handleBackToCity = () => {
    setScreen("city_map");
  };

  // HQ Map -> 1. Finance & Operations Hotspot: Opens the 3-Round Diminishing Marginal Returns Reactor
  const handleEnterFinance = () => {
    setScreen("finance");
  };

  // Completion of the 3-round training reactor unlocks the actual operations interface
  const handleFinanceTrainingComplete = () => {
    setScreen("operations");
  };

  // After locking decisions in Actual Operations, return to HQ or view results
  const handleOperationsLockComplete = () => {
    setScreen("hq_map");
  };

  // HQ Map -> 2. Research & Development Hotspot
  const handleEnterResearch = () => {
    router.push("/hq/operations");
  };

  // HQ Map -> 3. Marketing & Acquisitions Hotspot
  const handleEnterMarketing = () => {
    router.push("/hq/market");
  };

  // HQ Map -> 4. Board Conference Hotspot
  const handleEnterBoard = () => {
    router.push("/hq/board");
  };

  if (screen === "operations" && sessionData) {
    return (
      <ActualOperationsScreen
        sessionData={sessionData}
        onBack={() => setScreen("hq_map")}
        onLockComplete={handleOperationsLockComplete}
      />
    );
  }

  if (screen === "finance" && sessionData) {
    return (
      <DiminishingReturnsTrainingReactor
        data={sessionData}
        onBack={() => setScreen("hq_map")}
        onComplete={handleFinanceTrainingComplete}
      />
    );
  }

  if (screen === "hq_map" && sessionData) {
    return (
      <FigmaHQMap
        data={sessionData}
        onBack={handleBackToCity}
        onEnterFinance={handleEnterFinance}
        onEnterMarketing={handleEnterMarketing}
        onEnterResearch={handleEnterResearch}
        onEnterBoard={handleEnterBoard}
        boardUnlocked={Boolean(activeBoard)}
      />
    );
  }

  if (screen === "city_map" && sessionData) {
    return (
      <FigmaCityMap
        data={sessionData}
        onEnterHQ={handleEnterHQ}
        onVisitClient={handleVisitClient}
        onVisitPress={handleVisitPress}
      />
    );
  }

  if (screen === "assignment" && sessionData) {
    return (
      <FigmaAssignment
        data={sessionData}
        onAccept={handleAcceptAssignment}
      />
    );
  }

  return <FigmaLogin onSuccess={handleLoginSuccess} />;
}



