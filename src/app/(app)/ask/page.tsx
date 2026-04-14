"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import QuestionCounter from "@/components/QuestionCounter";
import PaywallModal from "@/components/PaywallModal";
import StructuredAnswer from "@/components/StructuredAnswer";

const QUICK_ACTIONS = [
  "What's blocking me today?",
  "Should I trust this decision?",
  "Right time to make a move?",
  "What energy am I working with?",
  "Love & relationships right now",
  "Career timing this month",
];

const CATEGORIES = ["CAREER", "LOVE", "MONEY", "FAMILY", "TRAVEL", "HEALTH", "TIMING"];

interface StructuredData {
  confidenceScore: number;
  bestTimeWindows: string[];
  do: string[];
  avoid: string[];
  wait: string[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isGreeting?: boolean;
  structured?: StructuredData;
}

function getTimeOfDay(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// Strip ---STRUCTURED---...---END--- block from displayed text
function stripStructuredBlock(text: string): string {
  const startTag = "---STRUCTURED---";
  const endTag = "---END---";
  const startIdx = text.indexOf(startTag);
  if (startIdx === -1) return text;
  const endIdx = text.indexOf(endTag);
  if (endIdx === -1) return text.slice(0, startIdx).trim();
  return text.slice(0, startIdx).trim();
}

export default function AskPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showCategoryBar, setShowCategoryBar] = useState(false);

  // Quota state
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [passExpiresAt, setPassExpiresAt] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Fetch quota on mount
  useEffect(() => {
    if (!session?.user?.id) return;
    fetch("/api/quota")
      .then((r) => r.json())
      .then((data) => {
        setQuestionsUsed(data.freeQuestionsUsed ?? 0);
        setIsPaid(data.paymentStatus === "active" && !!data.passExpiresAt);
        setPassExpiresAt(data.passExpiresAt ?? null);
      })
      .catch(() => {});
  }, [session]);

  // Proactive greeting
  useEffect(() => {
    if (initialized) return;
    setInitialized(true);
    setLoading(true);

    fetch("/api/daily")
      .then((r) => r.json())
      .then((data) => {
        const insights: { text: string }[] = data.insights ?? [];
        const text =
          insights.length > 0
            ? `Good ${getTimeOfDay()} ✦\n\n${insights[0].text
                .replace(/\*\*(.*?)\*\*/g, "$1")
                .replace(/__(.*?)__/g, "$1")}`
            : `Good ${getTimeOfDay()} ✦\n\nThe stars are aligned and ready to guide you. What's on your mind?`;

        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: text,
            timestamp: new Date(),
            isGreeting: true,
          },
        ]);
        setShowQuickActions(true);
      })
      .catch(() => {
        setMessages([
          {
            id: "greeting",
            role: "assistant",
            content: `Good ${getTimeOfDay()} ✦\n\nThe stars are ready. What's on your mind?`,
            timestamp: new Date(),
            isGreeting: true,
          },
        ]);
        setShowQuickActions(true);
      })
      .finally(() => setLoading(false));
  }, [initialized]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    setShowQuickActions(false);
    setShowCategoryBar(true);

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          category: activeCategory,
        }),
      });

      // Paywall hit
      if (res.status === 402) {
        setShowPaywall(true);
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("API error");

      // Update quota from response headers
      const xUsed = res.headers.get("X-Questions-Used");
      const xPaid = res.headers.get("X-Was-Paid");
      if (xUsed) setQuestionsUsed(parseInt(xUsed, 10));
      if (xPaid === "0") setIsPaid(false);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let structuredData: StructuredData | undefined;

      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") break;
              try {
                const parsed = JSON.parse(data);

                // Structured output event
                if (parsed.structured) {
                  structuredData = parsed.structured;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsg.id
                        ? { ...m, structured: structuredData }
                        : m
                    )
                  );
                  continue;
                }

                const delta = parsed.delta?.text ?? parsed.text ?? "";
                assistantText += delta;
                const displayText = stripStructuredBlock(assistantText);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: displayText }
                      : m
                  )
                );
              } catch {
                // skip non-JSON
              }
            }
          }
        }
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "The stars are momentarily obscured. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "48px 24px 12px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="alia-dot" />
          <span
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "11px",
              fontWeight: 300,
              letterSpacing: "0.22em",
              color: "#9090A8",
            }}
          >
            ALIA
          </span>
        </div>

        <QuestionCounter
          used={questionsUsed}
          isPaid={isPaid}
          passExpiresAt={passExpiresAt}
          onUpgrade={() => setShowPaywall(true)}
        />
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
        }}
      >
        {/* Initial loading */}
        {loading && messages.length === 0 && (
          <div
            style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
              padding: "8px 0",
              animation: "fadeIn 200ms ease-out",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "slideUp 260ms ease-out",
            }}
          >
            {msg.role === "assistant" ? (
              <>
                <p
                  style={{
                    fontFamily: "var(--font-playfair), serif",
                    fontSize: msg.isGreeting ? "22px" : "19px",
                    fontWeight: 400,
                    lineHeight: 1.72,
                    color: "#ffffff",
                    maxWidth: "100%",
                    whiteSpace: "pre-wrap",
                    letterSpacing: "0.01em",
                  }}
                >
                  {msg.content
                    .replace(/\*\*(.*?)\*\*/g, "$1")
                    .replace(/__(.*?)__/g, "$1")}
                </p>
                {msg.structured && <StructuredAnswer data={msg.structured} />}
              </>
            ) : (
              <div
                style={{
                  background: "rgba(139,92,246,0.1)",
                  border: "1px solid rgba(139,92,246,0.2)",
                  borderRadius: "20px 20px 5px 20px",
                  padding: "12px 18px",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  fontWeight: 300,
                  color: "#ddddf5",
                  maxWidth: "80%",
                  lineHeight: 1.62,
                }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Quick action chips after greeting */}
        {showQuickActions && !loading && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              paddingTop: "4px",
              animation: "slideUp 300ms ease-out",
            }}
          >
            {QUICK_ACTIONS.map((action) => (
              <button key={action} onClick={() => sendMessage(action)} className="chip">
                {action}
              </button>
            ))}
          </div>
        )}

        {/* Typing indicator */}
        {loading && messages.length > 0 && (
          <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "4px 0" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        style={{
          flexShrink: 0,
          background: "rgba(7,7,16,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          paddingBottom: "calc(68px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Category chips */}
        {showCategoryBar && (
          <div style={{ padding: "10px 16px 6px", display: "flex", gap: "6px", overflowX: "auto" }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`chip${activeCategory === cat ? " active" : ""}`}
                style={{ fontSize: "10px", padding: "5px 12px" }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Text input row */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "10px", padding: "8px 16px 10px" }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the stars anything..."
            rows={1}
            style={{
              flex: 1,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "24px",
              padding: "12px 18px",
              color: "#fff",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "15px",
              fontWeight: 300,
              resize: "none",
              lineHeight: 1.5,
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "50%",
              background: loading || !input.trim() ? "rgba(255,255,255,0.04)" : "rgba(139,92,246,0.24)",
              border: `1px solid ${loading || !input.trim() ? "rgba(255,255,255,0.06)" : "rgba(139,92,246,0.45)"}`,
              color: loading || !input.trim() ? "#3D3D52" : "#ffffff",
              fontSize: "18px",
              cursor: loading || !input.trim() ? "default" : "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 150ms ease",
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Paywall modal */}
      {showPaywall && (
        <PaywallModal
          onClose={() => setShowPaywall(false)}
          onUnlocked={(expiresAt) => {
            setIsPaid(true);
            setPassExpiresAt(expiresAt);
            setShowPaywall(false);
          }}
        />
      )}
    </div>
  );
}
