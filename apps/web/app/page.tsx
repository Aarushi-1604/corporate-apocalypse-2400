"use client";

import { useState } from "react";
import { registerPlayer, type RegisterResponse } from "@/lib/api/registration";

export default function Home() {
  const [form, setForm] = useState({
    full_name: "",
    prn: "",
    email: "",
    department: "",
    year_of_study: "",
  });
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      setResult(await registerPlayer(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-8">
        <h1 className="text-3xl font-bold">{result.company.name}</h1>
        <p className="mt-2 text-neutral-400">{result.company.sector}</p>
        <p className="mt-4 max-w-md text-center text-neutral-300">{result.company.backstory}</p>
        <div className="mt-6 space-y-1 text-sm text-neutral-400">
          <p>Starting cash: {result.company.cash.toFixed(0)}</p>
          <p>Employees: {result.company.employees}</p>
          <p>Strength: {result.company.unique_strength}</p>
          <p>Weakness: {result.company.unique_weakness}</p>
          <p>Passive: {result.company.unique_passive_ability}</p>
        </div>
        {result.resumed && (
          <p className="mt-4 text-xs text-yellow-500">Resumed existing session.</p>
        )}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white p-8">
      <h1 className="mb-6 text-2xl font-bold">Corporate Apocalypse 2400</h1>
      <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-3">
        <input name="full_name" placeholder="Full Name" value={form.full_name} onChange={handleChange} required className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        <input name="prn" placeholder="PRN" value={form.prn} onChange={handleChange} required className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} required className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        <input name="department" placeholder="Department" value={form.department} onChange={handleChange} required className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        <input name="year_of_study" placeholder="Year of Study" value={form.year_of_study} onChange={handleChange} required className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2" />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={submitting} className="rounded bg-white px-3 py-2 font-semibold text-black disabled:opacity-50">
          {submitting ? "Registering..." : "Enter The Apocalypse"}
        </button>
      </form>
    </main>
  );
}