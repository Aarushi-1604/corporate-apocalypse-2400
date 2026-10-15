import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Clean Supabase URL: remove trailing /rest/v1 if included in URL env var
const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, "");
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

// Create client if keys are present; otherwise provide a dummy client to avoid crashing during SSR / build
export const supabase: SupabaseClient = (cleanUrl && supabaseAnonKey)
  ? createClient(cleanUrl, supabaseAnonKey)
  : (createClient("https://placeholder.supabase.co", "placeholder-anon-key") as unknown as SupabaseClient);

