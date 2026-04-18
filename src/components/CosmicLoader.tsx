"use client";

import { useState, useEffect } from "react";

const COSMIC_LOADING_MESSAGES = [
  { quote: "The stars have been waiting for you.",          sub: "Reading your celestial alignment…"   },
  { quote: "Your birth chart is a map of infinite possibility.", sub: "Consulting the cosmos…"        },
  { quote: "Ancient wisdom, perfectly timed for this moment.",   sub: "Attuning to your energy…"     },
  { quote: "Every question you carry is already written in the stars.", sub: "Aligning the planets…" },
  { quote: "Vedic astrology has guided humanity for 5,000 years.", sub: "Drawing your personal chart…" },
  { quote: "Clarity is your birthright. The cosmos will reveal it.", sub: "Interpreting celestial patterns…" },
  { quote: "The universe doesn't make mistakes — and neither do you.", sub: "Weaving your cosmic thread…" },
  { quote: "Your unique alignment shapes your path. Let's decode it.", sub: "Preparing your insight…" },
];

function randomBase() {
  return Math.round((847 + Math.random() * 2400) / 7) * 7;
}
function nudge(n: number) {
  const delta = (Math.floor(Math.random() * 9) - 3) * (Math.random() > 0.5 ? 1 : -1);
  return Math.max(400, n + delta);
}

export default function CosmicLoader() {
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);
  const [users,   setUsers]   = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % COSMIC_LOADING_MESSAGES.length);
        setVisible(true);
      }, 500);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setUsers(randomBase());
    const id = setInterval(() => setUsers((n) => nudge(n)), 2300);
    return () => clearInterval(id);
  }, []);

  const msg = COSMIC_LOADING_MESSAGES[index];

  return (
    <div style={{
      flex: 1,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 8px", gap: "28px",
      animation: "fadeIn 400ms ease-out",
    }}>
      {/* Pulsing purple orb */}
      <div style={{ position: "relative", width: "72px", height: "72px" }}>
        <div style={{
          position: "absolute", inset: "-20px", borderRadius: "50%",
          border: "1px solid rgba(167,139,250,0.12)",
          animation: "cosmosRotate 14s linear infinite",
        }} />
        <div style={{
          position: "absolute", inset: "-8px", borderRadius: "50%",
          border: "1px solid rgba(124,58,237,0.18)",
          animation: "cosmosRotateReverse 9s linear infinite",
        }} />
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #c4b5fd 0%, #8b5cf6 45%, #3b0764 100%)",
          boxShadow: "0 0 40px rgba(124,58,237,0.4), 0 0 70px rgba(167,139,250,0.15)",
          animation: "glowPulse 3s ease-in-out infinite",
        }} />
      </div>

      {/* Cycling quote */}
      <div style={{
        textAlign: "center", maxWidth: "300px",
        transition: "opacity 500ms ease",
        opacity: visible ? 1 : 0,
      }}>
        <p style={{
          fontFamily: "var(--font-newsreader), serif",
          fontStyle: "italic",
          fontSize: "22px", fontWeight: 400,
          color: "#ffffff", lineHeight: 1.55,
          marginBottom: "12px", letterSpacing: "0.01em",
        }}>
          &ldquo;{msg.quote}&rdquo;
        </p>
        <p style={{
          fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
          fontSize: "11px", fontWeight: 500,
          letterSpacing: "0.2em", color: "#a78bfa",
          textTransform: "uppercase", opacity: 0.75,
        }}>
          {msg.sub}
        </p>
      </div>

      {/* Dots */}
      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>

      {/* Live active-users pill */}
      <div style={{
        display: "flex", alignItems: "center", gap: "7px",
        background: "rgba(124,58,237,0.07)",
        border: "1px solid rgba(167,139,250,0.14)",
        borderRadius: "999px", padding: "6px 14px",
      }}>
        <span style={{
          width: "6px", height: "6px", borderRadius: "50%",
          background: "#4ade80",
          boxShadow: "0 0 6px rgba(74,222,128,0.7)",
          display: "inline-block",
          animation: "glowPulse 2s ease-in-out infinite",
        }} />
        <span style={{
          fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
          fontSize: "11px", fontWeight: 500,
          letterSpacing: "0.05em", color: "#9d8fc4",
        }}>
          <span style={{ color: "#ffffff", fontWeight: 600 }}>
            {users.toLocaleString()}
          </span>
          {" seekers consulting the cosmos"}
        </span>
      </div>
    </div>
  );
}
