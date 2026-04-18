"use client";

import { signIn } from "next-auth/react";
import { useState, useEffect } from "react";

const ZODIACS = ["♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"];
const ZODIAC_NAMES = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];

function randomBase() {
  return Math.round((243 + Math.random() * 886) / 7) * 7;
}
function nudge(n: number) {
  const delta = (Math.floor(Math.random() * 5) - 2) * (Math.random() > 0.5 ? 1 : -1);
  return Math.min(1129, Math.max(243, n + delta));
}

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState(0);
  const [zodiacIndex, setZodiacIndex] = useState(0);
  const [zodiacVisible, setZodiacVisible] = useState(true);

  useEffect(() => {
    // Init random base only on client to avoid hydration mismatch
    setUsers(randomBase());
    const id = setInterval(() => setUsers((n) => nudge(n)), 2300);
    return () => clearInterval(id);
  }, []);

  // Cycle zodiac signs one by one inside the orb
  useEffect(() => {
    const id = setInterval(() => {
      setZodiacVisible(false);
      setTimeout(() => {
        setZodiacIndex((i) => (i + 1) % ZODIACS.length);
        setZodiacVisible(true);
      }, 400);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  async function handleGoogleSignIn() {
    setLoading(true);
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "#080810",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow blobs */}
      <div style={{
        position: "fixed", top: "-10%", left: "50%",
        transform: "translateX(-50%)",
        width: "600px", height: "400px",
        background: "radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 65%)",
        filter: "blur(80px)",
        animation: "orbFloat 16s ease-in-out infinite",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "0%", left: "-10%",
        width: "380px", height: "380px",
        background: "radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 70%)",
        filter: "blur(70px)",
        animation: "orbFloat3 20s ease-in-out infinite",
        pointerEvents: "none", zIndex: 0,
      }} />
      <div style={{
        position: "fixed", bottom: "10%", right: "-5%",
        width: "280px", height: "280px",
        background: "radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)",
        filter: "blur(60px)",
        animation: "orbFloat2 18s ease-in-out infinite",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Main content */}
      <div style={{
        position: "relative", zIndex: 1,
        display: "flex", flexDirection: "column",
        alignItems: "center", width: "100%", maxWidth: "380px",
      }}>

        {/* ── Cosmos mark with zodiac inside orb ── */}
        <div style={{
          textAlign: "center", marginBottom: "44px",
          animation: "revealUp 700ms cubic-bezier(0.16,1,0.3,1) both",
        }}>
          {/* Orb container */}
          <div style={{
            position: "relative",
            width: "200px", height: "200px",
            margin: "0 auto 28px",
          }}>
            {/* Deep glow behind orb */}
            <div style={{
              position: "absolute",
              inset: "-16px",
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(124,58,237,0.3) 0%, transparent 70%)",
              filter: "blur(28px)",
            }} />

            {/* Outer orbital ring — slow rotate */}
            <div style={{
              position: "absolute", inset: 0,
              borderRadius: "50%",
              border: "1px solid rgba(167,139,250,0.14)",
              animation: "cosmosRotate 40s linear infinite",
            }} />

            {/* Inner orbital ring — reverse */}
            <div style={{
              position: "absolute", inset: "20px",
              borderRadius: "50%",
              border: "1px solid rgba(124,58,237,0.18)",
              animation: "cosmosRotateReverse 26s linear infinite",
            }} />

            {/* Small orbital node on outer ring */}
            <div style={{
              position: "absolute",
              top: "-4px", left: "50%",
              marginLeft: "-4px",
              width: "8px", height: "8px",
              borderRadius: "50%",
              background: "#a78bfa",
              boxShadow: "0 0 12px rgba(167,139,250,0.9)",
              animation: "cosmosRotate 40s linear infinite",
              transformOrigin: "4px 104px",
            }} />

            {/* Core orb */}
            <div style={{
              position: "absolute",
              inset: "28px",
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 28%, #c4b5fd 0%, #8b5cf6 40%, #4c1d95 80%, #1e0a3c 100%)",
              boxShadow: "0 0 50px rgba(124,58,237,0.55), 0 0 90px rgba(167,139,250,0.18), inset 0 1px 1px rgba(255,255,255,0.15)",
              animation: "glowPulse 4s ease-in-out infinite",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "2px",
            }}>
              {/* Zodiac symbol cycling inside */}
              <span style={{
                fontSize: "38px",
                lineHeight: 1,
                opacity: zodiacVisible ? 1 : 0,
                transform: zodiacVisible ? "scale(1)" : "scale(0.7)",
                transition: "opacity 400ms ease, transform 400ms ease",
                filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))",
                color: "#ffffff",
                display: "block",
              }}>
                {ZODIACS[zodiacIndex]}
              </span>
              <span style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "9px",
                fontWeight: 500,
                letterSpacing: "0.14em",
                color: "rgba(255,255,255,0.5)",
                textTransform: "uppercase",
                opacity: zodiacVisible ? 1 : 0,
                transition: "opacity 400ms ease",
              }}>
                {ZODIAC_NAMES[zodiacIndex]}
              </span>
            </div>
          </div>

          <p style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "10px", letterSpacing: "0.42em",
            color: "#a78bfa", textTransform: "uppercase",
            marginBottom: "10px", fontWeight: 500,
          }}>
            Vedic Astrology
          </p>
          <h1 style={{
            fontFamily: "var(--font-space-grotesk), var(--font-newsreader), serif",
            fontSize: "46px", fontWeight: 700,
            color: "#ffffff", letterSpacing: "-0.01em",
            marginBottom: "14px", lineHeight: 1.05,
          }}>
            AstroDecide
          </h1>
          <p style={{
            fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
            fontSize: "14px", fontWeight: 400,
            color: "#9d8fc4", lineHeight: 1.75,
            maxWidth: "255px", margin: "0 auto",
          }}>
            Ask life&rsquo;s hardest questions.
            <br />
            Get answers from the stars.
          </p>
        </div>

        {/* ── Sign-in card ── */}
        <div style={{
          width: "100%",
          background: "rgba(20,10,40,0.7)",
          backdropFilter: "blur(32px)",
          WebkitBackdropFilter: "blur(32px)",
          borderRadius: "24px",
          border: "1px solid rgba(167,139,250,0.12)",
          padding: "32px 28px",
          animation: "revealUp 800ms cubic-bezier(0.16,1,0.3,1) 180ms both",
          boxShadow: "0 0 60px rgba(124,58,237,0.08)",
        }}>
          {/* Google CTA */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              display: "flex", alignItems: "center", gap: "12px",
              padding: "15px 24px", width: "100%", justifyContent: "center",
              background: loading ? "rgba(30,10,60,0.6)" : "#ffffff",
              borderRadius: "999px",
              border: loading ? "1px solid rgba(167,139,250,0.15)" : "none",
              color: loading ? "#9d8fc4" : "#1a0533",
              fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
              fontSize: "14px", fontWeight: 600,
              letterSpacing: "0.02em",
              cursor: loading ? "default" : "pointer",
              transition: "all 220ms ease",
              boxShadow: loading ? "none" : "0 4px 28px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              if (!loading) (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 40px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.boxShadow = loading ? "none" : "0 4px 28px rgba(0,0,0,0.3)";
            }}
          >
            {!loading && (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            {loading ? "Aligning the stars…" : "Continue with Google"}
          </button>

          {/* Feature list */}
          <div style={{ marginTop: "26px", display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { icon: "✦", text: "1 free question to start" },
              { icon: "◎", text: "Personalized Vedic birth chart" },
              { icon: "◇", text: "AI-powered cosmic guidance" },
            ].map((item) => (
              <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "#a78bfa", flexShrink: 0, lineHeight: 1 }}>
                  {item.icon}
                </span>
                <span style={{
                  fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
                  fontSize: "12px", fontWeight: 400,
                  color: "#6d5a8a", letterSpacing: "0.01em",
                }}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Live counter */}
        <div style={{
          marginTop: "20px",
          display: "flex", alignItems: "center", gap: "7px",
          background: "rgba(124,58,237,0.07)",
          border: "1px solid rgba(167,139,250,0.14)",
          borderRadius: "999px", padding: "6px 14px",
          animation: "revealUp 900ms cubic-bezier(0.16,1,0.3,1) 260ms both",
        }}>
          <span style={{
            width: "6px", height: "6px", borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 6px rgba(74,222,128,0.7)",
            display: "inline-block",
            animation: "glowPulse 2s ease-in-out infinite",
            flexShrink: 0,
          }} />
          <span style={{
            fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
            fontSize: "11px", fontWeight: 500,
            letterSpacing: "0.04em", color: "#9d8fc4",
          }}>
            <span style={{ color: "#ffffff", fontWeight: 600 }}>
              {users.toLocaleString()}
            </span>
            {" seekers online right now"}
          </span>
        </div>

        {/* Footer */}
        <p style={{
          marginTop: "16px",
          fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 400,
          color: "#3d2f5a", textAlign: "center",
          letterSpacing: "0.04em",
          animation: "revealUp 900ms cubic-bezier(0.16,1,0.3,1) 320ms both",
        }}>
          Your birth chart · Your decisions · Your stars
        </p>
      </div>
    </div>
  );
}
