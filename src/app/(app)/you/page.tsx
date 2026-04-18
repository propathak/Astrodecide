"use client";

import Link from "next/link";
import CosmicLoader from "@/components/CosmicLoader";
import { useProfile } from "@/contexts/ProfileContext";

// Zodiac data — sign → element, keyword, description, accent color
const SIGN_META: Record<string, {
  element: string; elementSymbol: string;
  keyword: string; desc: string;
  color: string; bgGlow: string;
}> = {
  Aries:       { element: "Fire",  elementSymbol: "△", keyword: "The Initiator",    desc: "Bold, pioneering, driven by instinct", color: "#ff8a80", bgGlow: "rgba(255,138,128,0.12)" },
  Taurus:      { element: "Earth", elementSymbol: "▽", keyword: "The Cultivator",   desc: "Grounded, sensual, patient builder",   color: "#a5d6a7", bgGlow: "rgba(165,214,167,0.10)" },
  Gemini:      { element: "Air",   elementSymbol: "△", keyword: "The Communicator", desc: "Curious, adaptable, quick-minded",     color: "#fff176", bgGlow: "rgba(255,241,118,0.10)" },
  Cancer:      { element: "Water", elementSymbol: "▽", keyword: "The Protector",    desc: "Intuitive, nurturing, emotionally deep",color: "#90caf9", bgGlow: "rgba(144,202,249,0.12)" },
  Leo:         { element: "Fire",  elementSymbol: "△", keyword: "The Radiant One",  desc: "Magnetic, generous, born to lead",     color: "#ffd54f", bgGlow: "rgba(255,213,79,0.12)"  },
  Virgo:       { element: "Earth", elementSymbol: "▽", keyword: "The Healer",       desc: "Precise, devoted, keenly perceptive",  color: "#c5e1a5", bgGlow: "rgba(197,225,165,0.10)" },
  Libra:       { element: "Air",   elementSymbol: "△", keyword: "The Harmonizer",   desc: "Aesthetic, balanced, deeply fair",     color: "#f8bbd0", bgGlow: "rgba(248,187,208,0.12)" },
  Scorpio:     { element: "Water", elementSymbol: "▽", keyword: "The Alchemist",    desc: "Intense, perceptive, transformative",  color: "#ce93d8", bgGlow: "rgba(206,147,216,0.12)" },
  Sagittarius: { element: "Fire",  elementSymbol: "△", keyword: "The Seeker",       desc: "Adventurous, philosophical, free",     color: "#ffcc80", bgGlow: "rgba(255,204,128,0.12)" },
  Capricorn:   { element: "Earth", elementSymbol: "▽", keyword: "The Achiever",     desc: "Ambitious, disciplined, timeless",     color: "#bcaaa4", bgGlow: "rgba(188,170,164,0.10)" },
  Aquarius:    { element: "Air",   elementSymbol: "△", keyword: "The Visionary",    desc: "Innovative, independent, ahead of time",color: "#80deea", bgGlow: "rgba(128,222,234,0.12)" },
  Pisces:      { element: "Water", elementSymbol: "▽", keyword: "The Mystic",       desc: "Compassionate, dreamy, spiritually gifted", color: "#a5c8e1", bgGlow: "rgba(165,200,225,0.12)" },
};

const DEFAULT_META = { element: "—", elementSymbol: "◇", keyword: "—", desc: "—", color: "#adaaaa", bgGlow: "rgba(173,170,170,0.08)" };

function getSignMeta(sign: string) {
  if (!sign || sign === "—") return DEFAULT_META;
  // Handle "Aries" or "Aries (Mesha)" etc.
  const clean = sign.split(" ")[0];
  return SIGN_META[clean] ?? DEFAULT_META;
}

export default function YouPage() {
  const { profile, loading } = useProfile();

  if (loading) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <CosmicLoader />
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-newsreader), serif", fontSize: "26px", color: "#fff", marginBottom: "8px" }}>
          Your chart awaits.
        </p>
        <p style={{ fontFamily: "var(--font-manrope), sans-serif", fontSize: "14px", color: "#adaaaa", marginBottom: "36px" }}>
          Complete your cosmic profile to unlock your blueprint.
        </p>
        <Link href="/onboarding" className="btn-primary">Begin →</Link>
      </div>
    );
  }

  const risingMeta = getSignMeta(profile.rising);
  const moonMeta   = getSignMeta(profile.moon);
  const sunMeta    = getSignMeta(profile.sun);

  return (
    <div style={{ minHeight: "100dvh", padding: "56px 24px 108px", maxWidth: "430px", margin: "0 auto" }}>

      {/* ── Identity Header ─────────────────────────────────── */}
      <div style={{ textAlign: "center", marginBottom: "36px", animation: "revealUp 600ms cubic-bezier(0.16,1,0.3,1) both" }}>
        {/* Avatar orb */}
        <div style={{
          width: "72px", height: "72px", borderRadius: "50%",
          background: `radial-gradient(circle at 35% 30%, ${risingMeta.color}99, ${sunMeta.color}66 50%, rgba(14,14,14,0.8) 100%)`,
          boxShadow: `0 0 40px ${risingMeta.bgGlow}, 0 0 70px ${sunMeta.bgGlow}`,
          margin: "0 auto 20px",
          border: "1px solid rgba(255,255,255,0.08)",
          animation: "glowPulse 4s ease-in-out infinite",
        }} />

        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.28em", color: "#a78bfa",
          textTransform: "uppercase", marginBottom: "8px",
        }}>
          Your Cosmic Blueprint
        </p>
        <h1 style={{
          fontFamily: "var(--font-newsreader), serif",
          fontSize: "38px", fontWeight: 400,
          color: "#ffffff", letterSpacing: "0.02em",
          lineHeight: 1.1, marginBottom: "12px",
        }}>
          {profile.name}
        </h1>
        <p style={{
          fontFamily: "var(--font-newsreader), serif",
          fontStyle: "italic",
          fontSize: "16px", color: "#adaaaa",
          lineHeight: 1.6, maxWidth: "280px", margin: "0 auto",
        }}>
          &ldquo;{profile.summary}&rdquo;
        </p>
      </div>

      {/* ── The Big Three ────────────────────────────────────── */}
      <div style={{ marginBottom: "28px", animation: "revealUp 650ms cubic-bezier(0.16,1,0.3,1) 80ms both" }}>
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.22em", color: "#adaaaa",
          textTransform: "uppercase", marginBottom: "14px",
        }}>
          The Big Three
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {[
            { role: "Rising", roleDesc: "How the world sees you", sign: profile.rising, meta: risingMeta, accent: "#a78bfa" },
            { role: "Moon",   roleDesc: "Your emotional core",    sign: profile.moon,   meta: moonMeta,   accent: "#c47fff" },
            { role: "Sun",    roleDesc: "Your essential self",    sign: profile.sun,    meta: sunMeta,    accent: "#ff5ed6" },
          ].map((item) => (
            <div
              key={item.role}
              style={{
                background: "rgba(38,38,38,0.38)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: "20px",
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                boxShadow: `0 0 30px ${item.meta.bgGlow}`,
              }}
            >
              {/* Sign color dot */}
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%", flexShrink: 0,
                background: `radial-gradient(circle at 35% 30%, ${item.meta.color}cc, ${item.meta.color}44 70%, transparent)`,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1px solid ${item.meta.color}33`,
              }}>
                <span style={{ fontSize: "14px", color: item.meta.color, fontFamily: "serif" }}>
                  {item.meta.elementSymbol}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "2px" }}>
                  <span style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontSize: "9px", fontWeight: 600,
                    letterSpacing: "0.2em", color: item.accent,
                    textTransform: "uppercase",
                  }}>
                    {item.role}
                  </span>
                  <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "10px" }}>·</span>
                  <span style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontSize: "9px", fontWeight: 400,
                    color: "#494847", letterSpacing: "0.04em",
                  }}>
                    {item.meta.element}
                  </span>
                </div>
                <p style={{
                  fontFamily: "var(--font-newsreader), serif",
                  fontSize: "18px", fontWeight: 400,
                  color: "#ffffff", marginBottom: "2px",
                }}>
                  {item.sign} <span style={{ color: item.meta.color, fontStyle: "italic", fontSize: "14px" }}>— {item.meta.keyword}</span>
                </p>
                <p style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: "11px", fontWeight: 300,
                  color: "#777575",
                }}>
                  {item.meta.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Personality Traits ───────────────────────────────── */}
      <div style={{ marginBottom: "28px", animation: "revealUp 650ms cubic-bezier(0.16,1,0.3,1) 160ms both" }}>
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.22em", color: "#adaaaa",
          textTransform: "uppercase", marginBottom: "14px",
        }}>
          Your Nature
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {(profile.traits ?? []).map((trait, i) => {
            const colors = ["#a78bfa", "#c084fc", "#f472b6", "#a78bfa", "#c084fc", "#f472b6"];
            const c = colors[i % colors.length];
            return (
              <span key={trait} style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "12px", fontWeight: 500,
                letterSpacing: "0.04em",
                color: c,
                background: `${c}12`,
                border: `1px solid ${c}28`,
                borderRadius: "999px",
                padding: "7px 16px",
              }}>
                {trait}
              </span>
            );
          })}
        </div>
      </div>

      {/* ── Life Phase / Dasha ───────────────────────────────── */}
      <div style={{ marginBottom: "28px", animation: "revealUp 650ms cubic-bezier(0.16,1,0.3,1) 240ms both" }}>
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.22em", color: "#adaaaa",
          textTransform: "uppercase", marginBottom: "14px",
        }}>
          Current Life Phase
        </p>
        <div style={{
          background: "rgba(167,139,250,0.04)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(167,139,250,0.1)",
          borderRadius: "20px",
          padding: "20px 20px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <p style={{
              fontFamily: "var(--font-newsreader), serif",
              fontSize: "20px", fontWeight: 400, color: "#ffffff",
            }}>
              {profile.dasha}
            </p>
            {profile.dashaEnd && (
              <span style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "10px", fontWeight: 500,
                color: "#a78bfa", letterSpacing: "0.08em",
                background: "rgba(167,139,250,0.08)",
                border: "1px solid rgba(167,139,250,0.15)",
                borderRadius: "999px",
                padding: "3px 10px",
              }}>
                until {profile.dashaEnd}
              </span>
            )}
          </div>
          {profile.dashaDescription && (
            <p style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "13px", fontWeight: 300,
              color: "#adaaaa", lineHeight: 1.65,
            }}>
              {profile.dashaDescription}
            </p>
          )}
        </div>
      </div>

      {/* ── Insights ────────────────────────────────────────── */}
      <div style={{ animation: "revealUp 650ms cubic-bezier(0.16,1,0.3,1) 320ms both" }}>
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.22em", color: "#adaaaa",
          textTransform: "uppercase", marginBottom: "14px",
        }}>
          Cosmic Insights
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {[
            { key: "career",        label: "Career",        icon: "◎", accent: "#a78bfa", text: profile.insights.career },
            { key: "relationships", label: "Relationships",  icon: "♡", accent: "#ff5ed6", text: profile.insights.relationships },
            { key: "self",          label: "Inner Self",     icon: "✦", accent: "#c47fff", text: profile.insights.self },
          ].map((block, i) => (
            <div
              key={block.key}
              style={{
                borderRadius: i === 0 ? "20px 20px 6px 6px" : i === 2 ? "6px 6px 20px 20px" : "6px",
                background: "rgba(38,38,38,0.35)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255,255,255,0.04)",
                padding: "18px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <span style={{ color: block.accent, fontSize: "12px" }}>{block.icon}</span>
                <span style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: "10px", fontWeight: 600,
                  letterSpacing: "0.2em", color: block.accent,
                  textTransform: "uppercase",
                }}>
                  {block.label}
                </span>
              </div>
              <p style={{
                fontFamily: "var(--font-newsreader), serif",
                fontSize: "16px", fontWeight: 400,
                color: "#ffffff", lineHeight: 1.7,
              }}>
                {block.text?.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Settings ────────────────────────────────────────── */}
      <div style={{ textAlign: "center", marginTop: "40px" }}>
        <Link
          href="/settings"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "10px", fontWeight: 500,
            letterSpacing: "0.2em", color: "#494847",
            textTransform: "uppercase", textDecoration: "none",
          }}
        >
          Settings →
        </Link>
      </div>
    </div>
  );
}
