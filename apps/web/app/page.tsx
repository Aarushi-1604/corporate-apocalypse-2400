"use client";

import { useState } from "react";
import { type RegisterResponse } from "@/lib/api/registration";
import { FigmaLogin } from "@/components/domain/FigmaLogin";
import { FigmaAssignment } from "@/components/domain/FigmaAssignment";
import { FigmaCityMap } from "@/components/domain/FigmaCityMap";

type Screen = "login" | "assignment" | "city_map";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("login");
  const [sessionData, setSessionData] = useState<RegisterResponse | null>(null);

  const handleLoginSuccess = (response: RegisterResponse) => {
    setSessionData(response);
    setScreen("assignment");
  };

  const handleAcceptAssignment = () => {
    setScreen("city_map");
  };

  const handleEnterHQ = () => {
    // STOP at Assignment -> City Map per Phase 4A.3 constraints.
    // HQ Map will be integrated in Phase 4A.4.
  };

  if (screen === "city_map" && sessionData) {
    return (
      <FigmaCityMap
        data={sessionData}
        onEnterHQ={handleEnterHQ}
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

