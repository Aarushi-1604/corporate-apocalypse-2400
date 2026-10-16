"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Sparkles,
  HelpCircle,
  FileEdit,
  Lightbulb,
  BookOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { API_BASE } from "@/lib/api-config";
import { useSession } from "@/lib/hooks/use-session";

interface Message {
  id: string;
  sender: "user" | "aria";
  text: string;
  source?: string;
  isBlocked?: boolean;
  timestamp: string;
}

const QUICK_ACTIONS = [
  { label: "Strategic Hint", icon: Lightbulb, query: "What trade-offs should I consider for my current department decision?" },
  { label: "Explain Question", icon: HelpCircle, query: "Can you clarify what the stakeholder or question is asking me to consider?" },
  { label: "Explain Jargon", icon: BookOpen, query: "Explain the key financial and market terms on this screen in simple language." },
  { label: "Rephrase Draft", icon: FileEdit, query: "Rephrase my draft into professional corporate executive language: " },
];

export function AriaAssistant() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "aria",
      text: "Greetings, CEO. I am ARIA, your Executive Intelligence Advisor. I can explain business terminology, clarify stakeholder queries, offer strategic trade-off hints, or rephrase your public statements into polished corporate prose. How may I assist your mandate?",
      timestamp: "EXEC-OS",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [remainingQueries, setRemainingQueries] = useState<number>(3);
  const [screenQuotaExceeded, setScreenQuotaExceeded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Derive current screen context from pathname
  const screenName = pathname.replace(/^\/hq\/?/, "").replace(/^\//, "") || "city";

  // Reset per-screen state whenever screenName changes
  useEffect(() => {
    setRemainingQueries(3);
    setScreenQuotaExceeded(false);
  }, [screenName]);

  // Auto-scroll messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Click outside to close drawer
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        const launcher = document.querySelector(".aria-assistant-launcher-container");
        if (launcher && !launcher.contains(e.target as Node)) {
          setIsOpen(false);
        }
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Don't render launcher on login/auth routes
  if (pathname === "/login" || pathname === "/assignment") {
    return null;
  }

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    if (remainingQueries <= 0 || screenQuotaExceeded) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: "aria",
          text: `[ARIA QUOTA WARNING] Screen query limit reached (0/3 remaining). To maintain strategic autonomy, ARIA advisory quotas reset upon moving to a new department or the next quarter.`,
          isBlocked: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/ai/advisor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          query: textToSend,
          screen: screenName,
          context: `Company: ${session?.company?.name || "Apex Dynamics"}, Quarter: ${session?.current_quarter || 1}, Screen: ${screenName}`,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (typeof data.queries_remaining === "number") {
        setRemainingQueries(data.queries_remaining);
        if (data.queries_remaining <= 0) {
          setScreenQuotaExceeded(true);
        }
      }

      const replyText =
        (data.answer && data.answer.trim()) ||
        "Executive advisory telemetry active. In commercial client negotiations, align deliverable milestones closely with your core operational capabilities while maintaining at least 15% liquid capital reserves.";

      const ariaMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "aria",
        text: replyText,
        source: data.source,
        isBlocked: data.was_blocked,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, ariaMsg]);
    } catch {
      // Graceful fallback
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "aria",
          text: "Communications interference detected on satellite link. Telemetry advisory: Review your liquid cash balance and avoid single commitments exceeding 25% of available capital. Prioritize operational resilience over rapid speculative expansion.",
          source: "offline_heuristic",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Launcher Button on the Left */}
      <aside
        aria-label="ARIA AI Assistant"
        className="aria-assistant-launcher-container fixed left-4 bottom-6 z-40 select-none"
      >
        <button
          onClick={() => setIsOpen((prev) => !prev)}
          className={`relative group flex items-center gap-2.5 px-3 py-2.5 rounded-full border border-amber-500/50 bg-[#080c14]/95 shadow-[0_0_25px_rgba(251,191,36,0.25)] hover:border-amber-400 hover:shadow-[0_0_35px_rgba(251,191,36,0.4)] transition-all duration-300 active:scale-95 ${
            isOpen ? "ring-2 ring-amber-400/80 bg-amber-950/40" : ""
          }`}
          aria-label={isOpen ? "Close ARIA Assistant" : "Open ARIA AI Assistant"}
          title="ARIA // EXECUTIVE AI ADVISOR"
        >
          {/* Animated Glow Ring */}
          <div className="absolute inset-0 rounded-full border border-amber-400/30 animate-pulse pointer-events-none" />
          
          <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/60 text-amber-400">
            <Bot className="w-4 h-4 animate-pulse" />
          </div>

          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[11px] font-mono font-bold tracking-widest text-amber-400 flex items-center gap-1">
              <span>ARIA AI</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            </span>
            <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">
              {remainingQueries}/3 QUOTA
            </span>
          </div>
        </button>
      </aside>

      {/* Floating Side Drawer on the Left */}
      {isOpen && (
        <div
          ref={drawerRef}
          className="fixed left-4 bottom-20 z-50 w-[92vw] sm:w-[420px] max-h-[82vh] h-[580px] bg-[#090d16]/98 border border-amber-500/60 rounded-xl shadow-[0_0_50px_rgba(0,0,0,0.8),0_0_30px_rgba(251,191,36,0.2)] backdrop-blur-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
          role="dialog"
          aria-label="ARIA Intelligence Console"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-950/40 via-black to-[#0d1424] border-b border-amber-500/30">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase flex items-center gap-1.5">
                  <span>ARIA ADVISOR</span>
                  <span className="text-[9px] font-normal text-slate-400 px-1.5 py-0.2 bg-white/5 border border-white/10 rounded">
                    EXEC-OS v24
                  </span>
                </h3>
                <p className="text-[10px] font-mono text-slate-400">
                  TERMINAL: <span className="text-amber-300 uppercase">{screenName}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                  remainingQueries > 1
                    ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                    : remainingQueries === 1
                    ? "bg-amber-950/40 border-amber-500/40 text-amber-400"
                    : "bg-red-950/40 border-red-500/40 text-red-400"
                }`}
                title="Remaining questions for this screen before reset"
              >
                {remainingQueries} / 3 QUERIES
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors"
                aria-label="Close ARIA"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-black/40 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_ACTIONS.map((action, idx) => {
              const Icon = action.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    setInput(action.query);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#121929] hover:bg-amber-950/50 border border-white/10 hover:border-amber-500/50 text-[10px] font-mono text-slate-300 hover:text-amber-300 transition-colors whitespace-nowrap active:scale-95"
                >
                  <Icon className="w-3 h-3 text-amber-400" />
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>

          {/* Messages Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 font-sans text-xs">
            {messages.map((m) => {
              const isUser = m.sender === "user";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-slate-400">
                    <span>{isUser ? "YOU (CEO)" : "ARIA"}</span>
                    <span>•</span>
                    <span>{m.timestamp}</span>
                    {m.isBlocked && (
                      <span className="text-amber-400 flex items-center gap-0.5">
                        <AlertCircle className="w-2.5 h-2.5" /> GUARDED
                      </span>
                    )}
                  </div>
                  <div
                    className={`max-w-[88%] rounded-lg p-3 leading-relaxed ${
                      isUser
                        ? "bg-amber-500/15 border border-amber-500/40 text-amber-100 rounded-tr-none"
                        : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">
                      {m.text || "Advisory telemetry active. Proceed with strategic caution."}
                    </p>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2 text-amber-400 font-mono text-[11px] p-2 bg-amber-950/20 border border-amber-500/20 rounded">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>ARIA is synthesizing executive intelligence...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-black/60 border-t border-amber-500/30">
            {screenQuotaExceeded && (
              <div className="mb-2 px-2.5 py-1 rounded bg-amber-950/40 border border-amber-500/40 text-[10px] font-mono text-amber-300 flex items-center gap-1.5">
                <AlertCircle className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Quota reached for {screenName}. Resets upon entering another department.</span>
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  screenQuotaExceeded
                    ? "Terminal quota reached (3/3)..."
                    : "Ask ARIA about jargon, strategy hints, or rephrase..."
                }
                disabled={loading || screenQuotaExceeded}
                className="flex-1 bg-slate-900/90 border border-slate-700 focus:border-amber-400 rounded-md px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading || screenQuotaExceeded}
                className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-black disabled:text-slate-500 font-mono text-xs font-bold rounded-md flex items-center justify-center transition-all active:scale-95 shadow disabled:shadow-none"
                aria-label="Send Query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
