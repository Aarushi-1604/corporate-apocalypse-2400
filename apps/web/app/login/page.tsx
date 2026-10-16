"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FigmaLogin } from "@/components/domain/FigmaLogin";
import { VenueAccessGate } from "@/components/domain/VenueAccessGate";
import { useSession } from "@/lib/hooks/use-session";
import { API_BASE } from "@/lib/api-config";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, isLoading } = useSession();
  const [hasVenueAccess, setHasVenueAccess] = useState<boolean | null>(null);

  // Check venue access status on mount
  useEffect(() => {
    // 1. Check sessionStorage first for fast client hydration
    const localToken = sessionStorage.getItem("event_access_token");
    if (localToken) {
      setHasVenueAccess(true);
      return;
    }

    // 2. Query server for httpOnly cookie status
    fetch(`${API_BASE}/api/v1/access-gate/status`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { has_access: false }))
      .then((data) => {
        setHasVenueAccess(Boolean(data.has_access));
      })
      .catch(() => {
        setHasVenueAccess(false);
      });
  }, []);

  // If already authenticated with active company session, route to city (or bankruptcy if insolvent)
  useEffect(() => {
    if (!isLoading && session?.company) {
      if (session?.status === "bankrupt") {
        router.replace("/bankruptcy");
      } else {
        router.replace("/city");
      }
    }
  }, [session, isLoading, router]);

  // If waiting for venue status check
  if (hasVenueAccess === null || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-amber-500 font-mono tracking-widest text-xs">
        INITIALIZING SECURITY TELEMETRY...
      </div>
    );
  }

  // Show Venue Access Gate first if not authenticated with event access code
  if (!hasVenueAccess) {
    return (
      <VenueAccessGate
        onAccessGranted={() => {
          setHasVenueAccess(true);
        }}
      />
    );
  }

  // Access granted: render the CEO registration / login terminal
  return (
    <FigmaLogin
      onSuccess={() => {
        router.push("/assignment");
      }}
    />
  );
}
