"use client";

import { API_BASE } from "@/lib/api-config";

export async function restartSession() {
  const res = await fetch(`${API_BASE}/api/v1/sessions/restart`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to restart session");
  return res.json();
}
