"use client";

import { useState } from "react";
import { askAdvisor } from "@/lib/hooks/use-advisor";
import { askDictionary } from "@/lib/hooks/use-dictionary";

type Message = { role: "user" | "ai"; text: string; blocked?: boolean };

export default function AdvisorPage() {
  const [tab, setTab] = useState<"advisor" | "dictionary">("advisor");
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
      const res = tab === "advisor" ? await askAdvisor(query) : await askDictionary(query);
      setMessages((m) => [...m, { role: "ai", text: res.answer, blocked: res.was_blocked }]);
    } catch {
      setMessages((m) => [...m, { role: "ai", text: "Something went wrong. Try again." }]);
    } finally {
      setLoading(false);
    }
  }

  function switchTab(next: "advisor" | "dictionary") {
    setTab(next);
    setMessages([]); // stateless dictionary + a clean context switch, no mixed thread
  }

  return (
    <div className="flex h-full max-w-2xl flex-col">
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => switchTab("advisor")}
          className={`rounded px-3 py-1 text-sm font-semibold ${tab === "advisor" ? "bg-white text-black" : "border border-neutral-700 text-neutral-400"}`}
        >
          Corporate Advisor
        </button>
        <button
          onClick={() => switchTab("dictionary")}
          className={`rounded px-3 py-1 text-sm font-semibold ${tab === "dictionary" ? "bg-white text-black" : "border border-neutral-700 text-neutral-400"}`}
        >
          Corporate Dictionary
        </button>
      </div>

      <p className="mb-4 text-xs text-neutral-500">
        {tab === "advisor"
          ? "Grounded in your company's current numbers -- asks trade-off questions, not direct answers."
          : "Neutral concept lookup -- no access to your company's data."}
      </p>

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
          placeholder={tab === "advisor" ? "Ask about a trade-off or a decision..." : "Ask what a term means..."}
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