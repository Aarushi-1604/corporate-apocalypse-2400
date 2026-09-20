"use client";

import { useState } from "react";
import { askAdvisor } from "@/lib/hooks/use-advisor";

type Message = { role: "user" | "advisor"; text: string; blocked?: boolean };

export default function AdvisorPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    if (!input.trim()) return;
    const query = input;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: query }]);
    setLoading(true);
    try {
      const res = await askAdvisor(query);
      setMessages((m) => [...m, { role: "advisor", text: res.answer, blocked: res.was_blocked }]);
    } catch {
      setMessages((m) => [...m, { role: "advisor", text: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full max-w-2xl flex-col">
      <h1 className="mb-4 text-2xl font-bold">Corporate Advisor</h1>

      <div className="flex-1 space-y-3 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded p-3 text-sm ${
              m.role === "user"
                ? "ml-auto bg-white text-black"
                : m.blocked
                  ? "border border-yellow-700 bg-neutral-950 text-neutral-300"
                  : "bg-neutral-900 text-neutral-200"
            }`}
          >
            {m.text}
          </div>
        ))}
        {loading && <p className="text-sm text-neutral-500">Thinking...</p>}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask about a trade-off, a metric, a decision..."
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm"
        />
        <button
          onClick={handleSend}
          disabled={loading}
          className="rounded bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}