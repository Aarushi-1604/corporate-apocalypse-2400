"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function restartSession() {
  const res = await fetch(`${API_BASE}/api/v1/sessions/restart`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to restart session");
  return res.json();
}