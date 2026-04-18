"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { useSession } from "next-auth/react";

// ── Types ────────────────────────────────────────────────────────────────────
export interface StructuredData {
  confidenceScore: number;
  bestTimeWindows: string[];
  do: string[];
  avoid: string[];
  wait: string[];
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isGreeting?: boolean;
  structured?: StructuredData;
}

interface OracleState {
  messages:         Message[];
  loading:          boolean;
  activeCategory:   string | null;
  showQuickActions: boolean;
  showCategoryBar:  boolean;
  questionsUsed:    number;
  isPaid:           boolean;
  passExpiresAt:    string | null;
  showPaywall:      boolean;

  setActiveCategory:   (c: string | null) => void;
  setShowPaywall:      (v: boolean) => void;
  setIsPaid:           (v: boolean) => void;
  setPassExpiresAt:    (v: string | null) => void;
  setQuestionsUsed:    (v: number) => void;
  sendMessage:         (text: string) => Promise<void>;
  messagesEndRef:      React.RefObject<HTMLDivElement | null>;
}

// ── Context ───────────────────────────────────────────────────────────────────
const OracleContext = createContext<OracleState | null>(null);

export function useOracle() {
  const ctx = useContext(OracleContext);
  if (!ctx) throw new Error("useOracle must be used inside OracleProvider");
  return ctx;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function stripStructuredBlock(text: string): string {
  const idx = text.indexOf("---STRUCTURED---");
  return idx === -1 ? text : text.slice(0, idx).trim();
}

function parseStructured(text: string): StructuredData | null {
  const start = text.indexOf("---STRUCTURED---");
  const end   = text.indexOf("---END---");
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start + 16, end).trim()) as StructuredData;
  } catch {
    return null;
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function OracleProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();

  const [messages,         setMessages]         = useState<Message[]>([]);
  const [loading,          setLoading]          = useState(false);
  const [activeCategory,   setActiveCategory]   = useState<string | null>(null);
  const [initialized,      setInitialized]      = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCategoryBar,  setShowCategoryBar]  = useState(false);
  const [questionsUsed,    setQuestionsUsed]    = useState(0);
  const [isPaid,           setIsPaid]           = useState(false);
  const [passExpiresAt,    setPassExpiresAt]    = useState<string | null>(null);
  const [showPaywall,      setShowPaywall]      = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Load quota once when session arrives
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/quota")
      .then((r) => r.json())
      .then((d) => {
        setQuestionsUsed(d.freeQuestionsUsed ?? 0);
        setIsPaid(d.paymentStatus === "active" && !!d.passExpiresAt);
        setPassExpiresAt(d.passExpiresAt ?? null);
      })
      .catch(() => {});
  }, [session?.user?.id]);

  // Load greeting + prior history once — never again on tab switch
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    setLoading(true);

    Promise.all([
      fetch("/api/daily").then((r) => r.json()).catch(() => ({})),
      fetch("/api/conversations").then((r) => r.json()).catch(() => ({ messages: [] })),
    ]).then(([dailyData, convData]) => {
      const insights: { text: string }[] = dailyData.insights ?? [];
      const greetingText = insights.length > 0
        ? `Good ${getTimeOfDay()} ✦\n\n${insights[0].text
            .replace(/\*\*(.*?)\*\*/g, "$1")
            .replace(/__(.*?)__/g, "$1")}`
        : `Good ${getTimeOfDay()} ✦\n\nThe stars are ready. What's on your mind?`;

      const greeting: Message = { id: "greeting", role: "assistant", content: greetingText, timestamp: new Date(), isGreeting: true };

      const priorMessages: Message[] = (convData.messages ?? []).map(
        (m: { role: "user" | "assistant"; content: string; createdAt: string }) => ({
          id: crypto.randomUUID(),
          role: m.role,
          content: m.role === "assistant"
            ? m.content.replace(/---STRUCTURED---[\s\S]*?---END---/g, "").trim()
            : m.content,
          timestamp: new Date(m.createdAt),
        })
      );

      if (priorMessages.length > 0) {
        // Paid user returning — show history + a "resuming" separator
        const resumeNote: Message = {
          id: "resume-note",
          role: "assistant",
          content: `Welcome back ✦\n\nPicking up where we left off — you have ${Math.floor(priorMessages.length / 2)} question${priorMessages.length / 2 !== 1 ? "s" : ""} from today.`,
          timestamp: new Date(),
          isGreeting: true,
        };
        setMessages([greeting, ...priorMessages, resumeNote]);
        setShowCategoryBar(true);
      } else {
        setMessages([greeting]);
        setShowQuickActions(true);
      }
    }).finally(() => setLoading(false));
  }, [initialized]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setShowQuickActions(false);
    setShowCategoryBar(true);

    const userMsg: Message = {
      id:        crypto.randomUUID(),
      role:      "user",
      content:   text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          category: activeCategory,
        }),
      });

      if (res.status === 402) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }
      if (!res.ok) throw new Error("API error");

      const xUsed = res.headers.get("X-Questions-Used");
      const xPaid = res.headers.get("X-Was-Paid");
      if (xUsed) setQuestionsUsed(parseInt(xUsed, 10));
      if (xPaid === "0") setIsPaid(false);

      const reader  = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText  = "";
      let structured: StructuredData | undefined;

      const assistantMsg: Message = { id: crypto.randomUUID(), role: "assistant", content: "", timestamp: new Date() };
      setMessages((prev) => [...prev, assistantMsg]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value, { stream: true }).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.structured) {
                structured = parsed.structured;
                setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, structured } : m));
                continue;
              }
              const delta = parsed.delta?.text ?? parsed.text ?? "";
              fullText += delta;
              setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, content: stripStructuredBlock(fullText) } : m));
            } catch { /* skip */ }
          }
        }
        // Parse structured from full text if not streamed separately
        if (!structured) {
          const s = parseStructured(fullText);
          if (s) setMessages((prev) => prev.map((m) => m.id === assistantMsg.id ? { ...m, structured: s } : m));
        }
      }
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "The stars are momentarily obscured. Please try again.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, activeCategory]);

  return (
    <OracleContext.Provider value={{
      messages, loading, activeCategory, showQuickActions, showCategoryBar,
      questionsUsed, isPaid, passExpiresAt, showPaywall,
      setActiveCategory, setShowPaywall, setIsPaid, setPassExpiresAt, setQuestionsUsed,
      sendMessage, messagesEndRef,
    }}>
      {children}
    </OracleContext.Provider>
  );
}
