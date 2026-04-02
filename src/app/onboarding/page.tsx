"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Field = "name" | "dob" | "tob" | "pob" | "submitting";

interface ChatMessage {
  id: string;
  role: "alia" | "user";
  content: string;
}

const INTRO_SEQUENCE: { content: string; delay: number }[] = [
  { content: "Hi ✦ I'm ALIA — your cosmic guide.", delay: 700 },
  { content: "I read the stars to help you navigate life's crossroads.", delay: 1500 },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentField, setCurrentField] = useState<Field | null>(null);
  const [typing, setTyping] = useState(false);
  const [data, setData] = useState({ name: "", dob: "", tob: "", pob: "" });
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setTyping(true);

    INTRO_SEQUENCE.forEach(({ content, delay }, i) => {
      timers.push(
        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            { id: `intro-${i}`, role: "alia", content },
          ]);
          if (i === INTRO_SEQUENCE.length - 1) {
            timers.push(
              setTimeout(() => {
                setMessages((prev) => [
                  ...prev,
                  { id: "q-name", role: "alia", content: "What's your name?" },
                ]);
                setCurrentField("name");
                setTyping(false);
              }, 650)
            );
          }
        }, delay)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (currentField && currentField !== "submitting" && !typing) {
      inputRef.current?.focus();
    }
  }, [messages, typing, currentField]);

  function validate(field: Field, value: string): string {
    if (!value.trim()) return "Please enter something.";
    if (field === "dob") {
      const parts = value.split("/");
      if (
        parts.length !== 3 ||
        parts[0].length !== 2 ||
        parts[1].length !== 2 ||
        parts[2].length !== 4
      ) {
        return "Use DD/MM/YYYY — e.g. 15/08/1995";
      }
    }
    return "";
  }

  async function handleSend() {
    if (!input.trim() || !currentField || currentField === "submitting" || typing) return;

    const err = validate(currentField, input);
    if (err) { setError(err); return; }
    setError("");

    const value = input.trim();
    setInput("");

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", content: value },
    ]);

    const newData = { ...data, [currentField]: value };
    setData(newData);
    setTyping(true);

    if (currentField === "pob") {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: "mapping",
            role: "alia",
            content: `✦ ${newData.name}, your celestial blueprint is being mapped...`,
          },
        ]);
        setCurrentField("submitting");
        setTyping(false);
        handleSubmit(newData);
      }, 650);
    } else {
      const responses: Record<string, string> = {
        name: `${value}. ✦\n\nWhen were you born? (DD/MM/YYYY)`,
        dob: "And the time? (HH:MM, 24-hour)\n\nNot sure? Your best guess works.",
        tob: "Where in the world were you born? (City, Country)",
      };
      const nextFields: Record<string, Field> = {
        name: "dob",
        dob: "tob",
        tob: "pob",
      };

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { id: `a-${currentField}`, role: "alia", content: responses[currentField] },
        ]);
        setCurrentField(nextFields[currentField]);
        setTyping(false);
      }, 720);
    }
  }

  async function handleSubmit(submitData: typeof data) {
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      if (!res.ok) throw new Error("Failed");
      await new Promise((r) => setTimeout(r, 2400));
      router.push("/ask");
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: "err", role: "alia", content: "Something went wrong. Where were you born again?" },
      ]);
      setCurrentField("pob");
    }
  }

  const showInput = currentField !== null && currentField !== "submitting" && !typing;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        maxWidth: "430px",
        margin: "0 auto",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "52px 24px 12px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "10px",
        }}
      >
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

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 24px 24px",
          display: "flex",
          flexDirection: "column",
          gap: "18px",
        }}
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "slideUp 260ms ease-out",
            }}
          >
            {msg.role === "alia" ? (
              <p
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "21px",
                  fontWeight: 400,
                  lineHeight: 1.68,
                  color: "#ffffff",
                  maxWidth: "90%",
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.content}
              </p>
            ) : (
              <div
                style={{
                  background: "rgba(139,92,246,0.12)",
                  border: "1px solid rgba(139,92,246,0.22)",
                  borderRadius: "20px 20px 5px 20px",
                  padding: "11px 18px",
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "15px",
                  fontWeight: 300,
                  color: "#e0e0f8",
                  maxWidth: "78%",
                  lineHeight: 1.55,
                }}
              >
                {msg.content}
              </div>
            )}
          </div>
        ))}

        {typing && (
          <div
            style={{
              display: "flex",
              gap: "5px",
              alignItems: "center",
              padding: "6px 0",
              animation: "fadeIn 200ms ease-out",
            }}
          >
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="typing-dot"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        )}

        {currentField === "submitting" && !typing && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px", paddingTop: "4px" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "#9090A8",
              }}
            >
              MAPPING STARS
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {showInput && (
        <div
          style={{
            flexShrink: 0,
            padding: "14px 20px calc(28px + env(safe-area-inset-bottom))",
            background: "rgba(7,7,16,0.92)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            animation: "slideUp 220ms ease-out",
          }}
        >
          {error && (
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                color: "#9090A8",
                marginBottom: "10px",
                letterSpacing: "0.08em",
              }}
            >
              {error}
            </p>
          )}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type here..."
              autoComplete="off"
              style={{
                flex: 1,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "999px",
                padding: "13px 20px",
                fontSize: "16px",
                color: "#fff",
                fontFamily: "var(--font-inter), sans-serif",
                fontWeight: 300,
              }}
            />
            <button
              onClick={handleSend}
              style={{
                width: "46px",
                height: "46px",
                borderRadius: "50%",
                background: "rgba(139,92,246,0.22)",
                border: "1px solid rgba(139,92,246,0.42)",
                color: "#fff",
                fontSize: "19px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
