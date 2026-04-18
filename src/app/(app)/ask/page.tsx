"use client";

import { useState, useRef } from "react";
import { useOracle } from "@/contexts/OracleContext";
import QuestionCounter from "@/components/QuestionCounter";
import PaywallModal from "@/components/PaywallModal";
import StructuredAnswer from "@/components/StructuredAnswer";
import CosmicLoader from "@/components/CosmicLoader";

const QUICK_ACTIONS = [
  "What's blocking me today?",
  "Should I trust this decision?",
  "Right time to make a move?",
  "What energy am I working with?",
  "Love & relationships right now",
  "Career timing this month",
];

const CATEGORIES = ["CAREER", "LOVE", "MONEY", "FAMILY", "TRAVEL", "HEALTH", "TIMING"];

export default function AskPage() {
  const {
    messages,
    loading,
    activeCategory,
    showQuickActions,
    showCategoryBar,
    questionsUsed,
    isPaid,
    passExpiresAt,
    showPaywall,
    setActiveCategory,
    setShowPaywall,
    setIsPaid,
    setPassExpiresAt,
    sendMessage,
    messagesEndRef,
  } = useOracle();

  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleSend(text: string) {
    if (!text.trim()) return;
    setInput("");
    await sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  }

  const canSend = !loading && input.trim().length > 0;

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", zIndex: 0 }}>
      {/* ── Header ────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: "48px 24px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(8,4,20,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderBottom: "1px solid rgba(167,139,250,0.07)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div className="alia-dot" />
          <span
            style={{
              fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
              fontSize: "10px",
              fontWeight: 600,
              letterSpacing: "0.28em",
              color: "#a78bfa",
              textTransform: "uppercase",
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

      {/* ── Messages ──────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 24px 16px",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
        }}
      >
        {/* Initial loading — cosmic uplift */}
        {loading && messages.length === 0 && <CosmicLoader />}

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
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontSize: msg.isGreeting ? "17px" : "15px",
                    fontWeight: msg.isGreeting ? 400 : 300,
                    lineHeight: 1.75,
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
                  background: "rgba(20,10,50,0.55)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(167,139,250,0.12)",
                  borderRadius: "20px 20px 5px 20px",
                  padding: "12px 18px",
                  fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
                  fontSize: "14px",
                  fontWeight: 400,
                  color: "#ede9fe",
                  maxWidth: "80%",
                  lineHeight: 1.62,
                }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {/* Quick action chips */}
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
              <button key={action} onClick={() => handleSend(action)} className="chip">
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

      {/* ── Input area ────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          background: "rgba(8,4,20,0.92)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          borderTop: "1px solid rgba(167,139,250,0.07)",
          paddingBottom: "calc(80px + env(safe-area-inset-bottom))",
        }}
      >
        {/* Category chips */}
        {showCategoryBar && (
          <div
            style={{
              padding: "10px 16px 6px",
              display: "flex",
              gap: "6px",
              overflowX: "auto",
              scrollbarWidth: "none",
            }}
          >
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`chip${activeCategory === cat ? " active" : ""}`}
                style={{ fontSize: "10px", padding: "5px 12px", letterSpacing: "0.08em" }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Text input row */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: "10px",
            padding: "8px 16px 12px",
          }}
        >
          <div
            style={{
              flex: 1,
              background: "rgba(20,10,45,0.6)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderRadius: "20px",
              border: "1px solid rgba(167,139,250,0.1)",
              display: "flex",
              alignItems: "flex-end",
              padding: "4px 4px 4px 16px",
              transition: "border-color 200ms ease",
            }}
            onFocusCapture={(e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor =
                "rgba(167,139,250,0.32)")
            }
            onBlurCapture={(e) =>
              ((e.currentTarget as HTMLDivElement).style.borderColor =
                "rgba(167,139,250,0.1)")
            }
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask the stars anything..."
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "10px 0",
                color: "#fff",
                fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
                fontSize: "15px",
                fontWeight: 400,
                resize: "none",
                lineHeight: 1.5,
                maxHeight: "120px",
                overflowY: "auto",
              }}
            />
            <button
              onClick={() => handleSend(input)}
              disabled={!canSend}
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "16px",
                background: canSend
                  ? "linear-gradient(135deg, #7c3aed, #a78bfa)"
                  : "rgba(167,139,250,0.04)",
                border: "none",
                color: canSend ? "#ffffff" : "#4a3665",
                fontSize: "17px",
                cursor: canSend ? "pointer" : "default",
                flexShrink: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 180ms ease",
                boxShadow: canSend ? "0 0 20px rgba(124,58,237,0.45)" : "none",
                fontWeight: 700,
                marginBottom: "1px",
              }}
            >
              →
            </button>
          </div>
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
