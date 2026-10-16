"use client";

export interface BankruptcyPayload {
  bankruptcy: boolean;
  action_attempted?: string;
  required_amount?: number;
  available_cash?: number;
  final_score?: number;
  company_name?: string;
  ceo_name?: string;
  quarter?: number;
  message?: string;
  press_headline?: string;
  press_body?: string;
}

const STORAGE_KEY = "ca2400_bankruptcy_state";

export function saveBankruptcyState(data: Partial<BankruptcyPayload>): void {
  if (typeof window === "undefined") return;
  try {
    const existingStr = sessionStorage.getItem(STORAGE_KEY);
    const existing = existingStr ? JSON.parse(existingStr) : {};
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...data, bankruptcy: true }));
  } catch (err) {
    console.error("Failed to persist bankruptcy state in session storage", err);
  }
}

export function getBankruptcyState(): BankruptcyPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const str = sessionStorage.getItem(STORAGE_KEY);
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
}

export function clearBankruptcyState(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function handleBankruptcyRedirect(
  data: Partial<BankruptcyPayload>,
  router?: { push: (url: string) => void; replace?: (url: string) => void }
): void {
  saveBankruptcyState(data);
  if (router?.replace) {
    router.replace("/bankruptcy");
  } else if (router?.push) {
    router.push("/bankruptcy");
  } else if (typeof window !== "undefined") {
    window.location.href = "/bankruptcy";
  }
}
