"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PlanetGlyph from "@/components/PlanetGlyph";

interface Profile {
  name: string;
  rising: string;
  moon: string;
  sun: string;
  dasha: string;
  dashaEnd: string;
  insights: {
    career: string;
    relationships: string;
    self: string;
  };
}

export default function YouPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((d) => setProfile(d.profile ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px 32px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "22px",
            fontWeight: 400,
            color: "#ffffff",
            marginBottom: "32px",
            lineHeight: 1.6,
          }}
        >
          You haven&apos;t set up your chart yet.
        </p>
        <Link href="/onboarding" className="btn-primary">
          Begin →
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        padding: "60px 28px 96px",
      }}
    >
      {/* Name */}
      <h1
        style={{
          fontFamily: "var(--font-playfair), serif",
          fontSize: "34px",
          fontWeight: 400,
          textAlign: "center",
          letterSpacing: "0.04em",
          marginBottom: "32px",
          color: "#ffffff",
        }}
      >
        {profile.name}
      </h1>

      {/* Rising / Moon / Sun */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "28px",
          marginBottom: "44px",
        }}
      >
        {[
          { label: "RISING", value: profile.rising, planet: "Ascendant" },
          { label: "MOON", value: profile.moon, planet: "Moon" },
          { label: "SUN", value: profile.sun, planet: "Sun" },
        ].map((item) => (
          <div key={item.label} style={{ textAlign: "center" }}>
            <PlanetGlyph planet={item.planet} size={14} color="#9090A8" />
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "9px",
                fontWeight: 300,
                letterSpacing: "0.18em",
                color: "#9090A8",
                textTransform: "uppercase",
                marginTop: "5px",
                marginBottom: "5px",
              }}
            >
              {item.label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: "15px",
                fontWeight: 400,
                color: "#ffffff",
              }}
            >
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Dasha */}
      <div className="divider" style={{ marginBottom: "28px" }} />
      <div
        style={{
          background: "rgba(139,92,246,0.07)",
          border: "1px solid rgba(139,92,246,0.15)",
          borderRadius: "16px",
          padding: "20px 24px",
          textAlign: "center",
          marginBottom: "40px",
        }}
      >
        <p className="label" style={{ marginBottom: "8px" }}>
          Current Dasha Period
        </p>
        <p
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "18px",
            fontWeight: 400,
            color: "#e0d8ff",
            marginBottom: "4px",
          }}
        >
          {profile.dasha}
        </p>
        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "11px",
            fontWeight: 300,
            letterSpacing: "0.1em",
            color: "#9090A8",
          }}
        >
          until {profile.dashaEnd}
        </p>
      </div>

      {/* Insight blocks */}
      {[
        { label: "CAREER", text: profile.insights.career },
        { label: "RELATIONSHIPS", text: profile.insights.relationships },
        { label: "SELF", text: profile.insights.self },
      ].map((block, i) => (
        <div key={block.label}>
          {i > 0 && <div className="divider" />}
          <div style={{ padding: "28px 0", textAlign: "center" }}>
            <p className="label" style={{ marginBottom: "14px" }}>
              {block.label}
            </p>
            <p
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontSize: "17px",
                fontWeight: 400,
                lineHeight: 1.8,
                color: "#ffffff",
              }}
            >
              {block.text
                ?.replace(/\*\*(.*?)\*\*/g, "$1")
                .replace(/__(.*?)__/g, "$1")}
            </p>
          </div>
        </div>
      ))}

      {/* Settings */}
      <div className="divider" style={{ marginTop: "8px", marginBottom: "28px" }} />
      <div style={{ textAlign: "center" }}>
        <Link
          href="/settings"
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "10px",
            fontWeight: 300,
            letterSpacing: "0.2em",
            color: "#3D3D52",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          SETTINGS →
        </Link>
      </div>
    </div>
  );
}
