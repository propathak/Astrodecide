"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);

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
        background: "#070710",
      }}
    >
      {/* Logo / Brand */}
      <div style={{ textAlign: "center", marginBottom: "56px" }}>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            letterSpacing: "0.25em",
            color: "rgba(255,255,255,0.35)",
            textTransform: "uppercase",
            marginBottom: "16px",
          }}
        >
          Vedic Astrology
        </p>
        <h1
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "42px",
            fontWeight: 400,
            color: "#ffffff",
            letterSpacing: "0.03em",
            marginBottom: "12px",
          }}
        >
          AstroDecide
        </h1>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "15px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1.6,
            maxWidth: "280px",
          }}
        >
          Ask life's hardest questions. Get answers from the stars.
        </p>
      </div>

      {/* Star decoration */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "48px",
          opacity: 0.3,
        }}
      >
        {["✦", "·", "✦", "·", "✦"].map((s, i) => (
          <span
            key={i}
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "14px",
              color: "#a78bfa",
            }}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Sign-in button */}
      <button
        onClick={handleGoogleSignIn}
        disabled={loading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "16px 28px",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "14px",
          color: "#ffffff",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "15px",
          fontWeight: 400,
          cursor: loading ? "default" : "pointer",
          opacity: loading ? 0.6 : 1,
          transition: "all 200ms ease",
          width: "100%",
          maxWidth: "320px",
          justifyContent: "center",
        }}
      >
        {/* Google icon */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        {loading ? "Signing in…" : "Continue with Google"}
      </button>

      {/* Features */}
      <div
        style={{
          marginTop: "48px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          width: "100%",
          maxWidth: "300px",
        }}
      >
        {[
          "✦  3 free questions to start",
          "✦  Personalized Vedic birth chart",
          "✦  AI-powered cosmic guidance",
        ].map((item) => (
          <p
            key={item}
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.4)",
              textAlign: "center",
            }}
          >
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
