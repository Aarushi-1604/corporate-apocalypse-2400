export type RegisterPayload = {
  full_name: string;
  prn: string;
  email: string;
  department: string;
  year_of_study: string;
};

export type CompanyOut = {
  name: string;
  sector: string;
  backstory: string;
  unique_strength: string;
  unique_weakness: string;
  unique_passive_ability: string;
  cash: number;
  employees: number;
};

export type RegisterResponse = {
  player_id: string;
  session_id: string;
  resumed: boolean;
  company: CompanyOut;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function registerPlayer(payload: RegisterPayload): Promise<RegisterResponse> {
  const res = await fetch(`${API_BASE}/api/v1/players/register`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? "Registration failed.");
  }

  return res.json();
}