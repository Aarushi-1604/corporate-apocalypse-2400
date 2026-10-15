export type SITRegisterPayload = {
  registration_type: "SIT";
  full_name: string;
  email: string;
  prn: string;
  department: string;
  year_of_study: string;
};

export type NonSITRegisterPayload = {
  registration_type: "NON_SIT";
  full_name: string;
  phone_number: string;
  institution_name: string;
};

export type RegisterPayload = SITRegisterPayload | NonSITRegisterPayload;


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
  company_id: string;
  current_quarter: number;
  resumed: boolean;
  company: CompanyOut;
};


import { API_BASE } from "@/lib/api-config";

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
