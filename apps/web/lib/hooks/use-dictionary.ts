"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type DictionaryResponse = { answer: string; source: string; was_blocked: boolean };

export async function askDictionary(query: string): Promise<DictionaryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/ai/dictionary`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error("Dictionary request failed");
  return res.json();
}