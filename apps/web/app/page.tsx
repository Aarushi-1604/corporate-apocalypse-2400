import { supabase } from "@/lib/supabase/client";

export default function Home() {
  const supabaseConfigured = Boolean(supabase);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white">
      <h1 className="text-4xl font-bold">Corporate Apocalypse 2400</h1>
      <p className="mt-4 text-neutral-400">
        Frontend skeleton — Phase 3 checkpoint
      </p>
      <p className="mt-2 text-sm text-neutral-500">
        Supabase client configured: {supabaseConfigured ? "yes" : "no"}
      </p>
    </main>
  );
}