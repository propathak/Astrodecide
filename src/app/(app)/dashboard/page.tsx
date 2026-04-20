"use client";

import { useState, useEffect } from "react";
import { useDashboard } from "@/contexts/DashboardContext";
import LifeIndexRing from "@/components/LifeIndexRing";
import LifeRadarChart from "@/components/LifeRadarChart";
import type { AreaData } from "@/app/api/dashboard/route";

// ── helpers ────────────────────────────────────────────────────────────────────
function scoreColor(score: number) {
  if (score >= 65) return { text: "#4ade80", bg: "rgba(74,222,128,0.08)",  border: "rgba(74,222,128,0.2)"  };
  if (score >= 40) return { text: "#fbbf24", bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)"  };
  return              { text: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.2)" };
}

function TrendArrow({ trend }: { trend: "up" | "down" | "stable" }) {
  const map = {
    up:     { symbol: "↑", color: "#4ade80" },
    down:   { symbol: "↓", color: "#f87171" },
    stable: { symbol: "→", color: "#fbbf24" },
  };
  const { symbol, color } = map[trend];
  return <span style={{ color, fontSize: "14px", fontWeight: 700 }}>{symbol}</span>;
}

const AREA_ICONS: Record<string, string> = {
  career: "◈", money: "◎", health: "◇", relationships: "✦", growth: "◉",
};

// ── Loading screen with cycling messages ───────────────────────────────────────
const LOADING_STEPS = [
  { icon: "✦", message: "Locating your planetary positions…" },
  { icon: "◎", message: "Reading your current dasha period…" },
  { icon: "◈", message: "Mapping Saturn's influence on your career…" },
  { icon: "◉", message: "Analysing the next 30 days of transits…" },
  { icon: "◇", message: "Calculating your Life Index score…" },
  { icon: "✦", message: "Almost there — your cosmic blueprint is ready." },
];

function DashboardLoader() {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible,   setVisible]   = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStepIndex((i) => Math.min(i + 1, LOADING_STEPS.length - 1));
        setVisible(true);
      }, 400);
    }, 2200);
    return () => clearInterval(interval);
  }, []);

  const step = LOADING_STEPS[stepIndex];

  return (
    <div style={{
      minHeight: "80dvh",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "0 40px", gap: 40,
    }}>
      {/* Animated orb */}
      <div style={{ position: "relative", width: 120, height: 120 }}>
        {/* Outer ring */}
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "1px solid rgba(167,139,250,0.18)",
          animation: "cosmosRotate 8s linear infinite",
        }} />
        {/* Inner ring */}
        <div style={{
          position: "absolute", inset: 16, borderRadius: "50%",
          border: "1px solid rgba(124,58,237,0.22)",
          animation: "cosmosRotateReverse 5s linear infinite",
        }} />
        {/* Orbital node */}
        <div style={{
          position: "absolute", top: -3, left: "50%", marginLeft: -3,
          width: 6, height: 6, borderRadius: "50%",
          background: "#a78bfa",
          boxShadow: "0 0 10px rgba(167,139,250,0.9)",
          animation: "cosmosRotate 8s linear infinite",
          transformOrigin: "3px 63px",
        }} />
        {/* Core */}
        <div style={{
          position: "absolute", inset: 24, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #c4b5fd 0%, #7c3aed 50%, #1e0a3c 100%)",
          boxShadow: "0 0 40px rgba(124,58,237,0.5), 0 0 80px rgba(167,139,250,0.15)",
          animation: "glowPulse 3s ease-in-out infinite",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{
            fontSize: 22, color: "#fff",
            opacity: visible ? 1 : 0,
            transform: visible ? "scale(1)" : "scale(0.7)",
            transition: "opacity 380ms ease, transform 380ms cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            {step.icon}
          </span>
        </div>
      </div>

      {/* Message */}
      <div style={{ textAlign: "center", minHeight: 60 }}>
        <p style={{
          fontFamily: "var(--font-newsreader), serif",
          fontSize: 20, fontWeight: 400, lineHeight: 1.6,
          color: "#ede9fe",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 380ms ease, transform 380ms ease",
          maxWidth: 280, margin: "0 auto",
        }}>
          {step.message}
        </p>
      </div>

      {/* Step dots */}
      <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
        {LOADING_STEPS.map((_, i) => (
          <div key={i} style={{
            width:  i === stepIndex ? 18 : 5,
            height: 5,
            borderRadius: 999,
            background: i === stepIndex
              ? "linear-gradient(90deg, #7c3aed, #a78bfa)"
              : "rgba(167,139,250,0.18)",
            transition: "width 300ms ease, background 300ms ease",
          }} />
        ))}
      </div>

      <p style={{
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: 10, fontWeight: 500, letterSpacing: "0.18em",
        color: "#3d2a5c", textTransform: "uppercase",
      }}>
        Reading your stars
      </p>
    </div>
  );
}

// ── Area detail bottom sheet ───────────────────────────────────────────────────
function AreaSheet({ area, onClose }: { area: AreaData; onClose: () => void }) {
  const col = scoreColor(area.score);
  const icon = AREA_ICONS[area.id] ?? "◇";

  const scoreLabel =
    area.score >= 65 ? "Strong" :
    area.score >= 40 ? "Moderate" : "Needs attention";

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,0,0,0.72)",
        backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: "rgba(10,5,22,0.98)",
        border: "1px solid rgba(167,139,250,0.1)",
        borderRadius: "28px 28px 0 0",
        padding: "20px 24px 48px",
        width: "100%", maxWidth: "430px",
        animation: "slideUp 300ms cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Handle */}
        <div style={{ width: 36, height: 4, background: "rgba(255,255,255,0.1)", borderRadius: 2, margin: "0 auto 20px" }} />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 20, color: col.text }}>{icon}</span>
            <h3 style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 18, fontWeight: 700, color: "#ede9fe" }}>
              {area.label}
            </h3>
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: col.bg, border: `1px solid ${col.border}`,
            borderRadius: 999, padding: "4px 12px",
          }}>
            <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 22, fontWeight: 800, color: col.text, lineHeight: 1 }}>
              {area.score}
            </span>
            <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, color: col.text, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {scoreLabel}
            </span>
          </div>
        </div>

        {/* Levels: Level 1 → Level 2 → Level 3 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* L1 — plain insight */}
          <div style={{ background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.1)", borderRadius: 16, padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(167,139,250,0.5)", textTransform: "uppercase", marginBottom: 6 }}>
              What this means
            </p>
            <p style={{ fontFamily: "var(--font-newsreader), serif", fontSize: 17, lineHeight: 1.65, color: "#ede9fe" }}>
              {area.insight}
            </p>
          </div>

          {/* L2 — what's influencing this */}
          <div style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.08)", borderRadius: 16, padding: "14px 16px" }}>
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", color: "rgba(167,139,250,0.4)", textTransform: "uppercase", marginBottom: 6 }}>
              What&apos;s influencing this
            </p>
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 13, lineHeight: 1.65, color: "#cdc5e8" }}>
              {area.influence}
            </p>
            {area.planet && (
              <span style={{
                display: "inline-block", marginTop: 8,
                background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.2)",
                borderRadius: 999, padding: "3px 10px",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: 10, fontWeight: 600, color: "#a78bfa", letterSpacing: "0.08em",
              }}>
                {area.planet}
              </span>
            )}
          </div>

          {/* L3 — action */}
          <div style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(167,139,250,0.06))",
            border: "1px solid rgba(167,139,250,0.2)",
            borderRadius: 16, padding: "14px 16px",
          }}>
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.18em", color: "#a78bfa", textTransform: "uppercase", marginBottom: 6 }}>
              Suggested action
            </p>
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 14, fontWeight: 600, lineHeight: 1.55, color: "#ede9fe" }}>
              {area.action}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{ width: "100%", marginTop: 18, padding: "11px", background: "transparent", border: "none", color: "#5c4a7a", fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 12, cursor: "pointer" }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

// ── Consultation upsell card ───────────────────────────────────────────────────
function ConsultationCard({ avgScore }: { avgScore: number }) {
  const potential = Math.min(93, avgScore + 26);
  const gap       = potential - avgScore;

  return (
    <div style={{
      position: "relative", overflow: "hidden",
      background: "linear-gradient(135deg, rgba(30,10,60,0.85) 0%, rgba(20,8,45,0.9) 100%)",
      border: "1px solid rgba(251,191,36,0.22)",
      borderRadius: 24, padding: "22px 20px 24px",
      boxShadow: "0 0 40px rgba(251,191,36,0.06), 0 8px 40px rgba(0,0,0,0.5)",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "absolute", top: -40, right: -40,
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Top badge */}
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
        <span style={{ fontSize: 13 }}>✦</span>
        <span style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: 9, fontWeight: 700, letterSpacing: "0.22em",
          textTransform: "uppercase", color: "#fbbf24",
        }}>
          Unlock Your Full Potential
        </span>
      </div>

      {/* Score gap visual */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 10, color: "#6d5a8a", letterSpacing: "0.06em",
            }}>
              You today
            </span>
            <span style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 10, color: "rgba(251,191,36,0.7)", letterSpacing: "0.06em",
            }}>
              With guidance
            </span>
          </div>
          {/* Progress bar */}
          <div style={{
            position: "relative", height: 8, borderRadius: 999,
            background: "rgba(167,139,250,0.08)",
            border: "1px solid rgba(167,139,250,0.1)",
          }}>
            {/* Potential bar */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${potential}%`, borderRadius: 999,
              background: "linear-gradient(90deg, rgba(251,191,36,0.3), rgba(251,191,36,0.55))",
              border: "1px dashed rgba(251,191,36,0.5)",
            }} />
            {/* Current bar */}
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${avgScore}%`, borderRadius: 999,
              background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5 }}>
            <span style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 18, fontWeight: 800, color: "#a78bfa",
            }}>
              {avgScore}
            </span>
            <div style={{ textAlign: "right" }}>
              <span style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: 18, fontWeight: 800, color: "#fbbf24",
              }}>
                {potential}
              </span>
              <span style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: 10, color: "#fbbf24", marginLeft: 5,
              }}>
                +{gap} pts
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Copy */}
      <p style={{
        fontFamily: "var(--font-newsreader), serif",
        fontSize: 17, lineHeight: 1.6, color: "#ede9fe",
        marginBottom: 6,
      }}>
        A personalised 1:1 session can help you close this gap.
      </p>
      <p style={{
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: 12, lineHeight: 1.6, color: "#6d5a8a",
        marginBottom: 20,
      }}>
        Our astrologers decode your chart in real-time — specific remedies, timing windows, and life decisions tailored only to you.
      </p>

      {/* Feature bullets */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
        {[
          { icon: "◈", text: "Deep-dive into your current dasha & transits" },
          { icon: "◎", text: "Precise timing for career, love & financial moves" },
          { icon: "◉", text: "Custom Vedic remedies & gemstone guidance" },
        ].map(({ icon, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "rgba(251,191,36,0.6)", flexShrink: 0 }}>{icon}</span>
            <span style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: 12, color: "#9d8fc4",
            }}>
              {text}
            </span>
          </div>
        ))}
      </div>

      {/* CTA button */}
      <a
        href="https://wa.me/919820000000?text=Hi%2C+I+saw+my+AstroDecide+dashboard+and+would+like+to+book+a+1%3A1+consultation"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          width: "100%", padding: "15px 20px",
          background: "linear-gradient(135deg, #92400e, #d97706, #fbbf24)",
          border: "none", borderRadius: 999, cursor: "pointer",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.1em",
          textTransform: "uppercase", color: "#1a0a00", textDecoration: "none",
          boxShadow: "0 4px 24px rgba(251,191,36,0.35), 0 0 48px rgba(251,191,36,0.1)",
          transition: "box-shadow 200ms ease, transform 150ms ease",
        }}
      >
        <span style={{ fontSize: 14 }}>✦</span>
        Speak to an Astrologer
      </a>

      {/* Trust line */}
      <p style={{
        fontFamily: "var(--font-space-grotesk), sans-serif",
        fontSize: 9, color: "#3d2a5c", textAlign: "center",
        marginTop: 10, letterSpacing: "0.08em",
      }}>
        Verified experts · Sessions from ₹499
      </p>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data, loading, error, refresh } = useDashboard();
  const [selectedArea, setSelectedArea] = useState<AreaData | null>(null);

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "60dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", textAlign: "center" }}>
        <p style={{ fontFamily: "var(--font-newsreader), serif", fontSize: 22, color: "#ede9fe", marginBottom: 8 }}>
          Couldn&apos;t read your stars.
        </p>
        <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 13, color: "#5c4a7a", marginBottom: 28 }}>
          Check your connection and try again.
        </p>
        <button
          onClick={refresh}
          style={{
            padding: "12px 28px", borderRadius: 999,
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            border: "none", color: "#fff",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: 13, fontWeight: 700, cursor: "pointer",
            boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading || !data) return <DashboardLoader />;

  const today = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long" });

  return (
    <>
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 32px", display: "flex", flexDirection: "column", gap: "28px" }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="alia-dot" />
            <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.28em", color: "#a78bfa", textTransform: "uppercase" }}>
              Life Insights
            </span>
          </div>
          <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 11, color: "#5c4a7a" }}>
            {today}
          </span>
        </div>

        {/* ── Life Index + Phase ── */}
        <div style={{
          background: "rgba(20,10,45,0.55)",
          border: "1px solid rgba(167,139,250,0.1)",
          borderRadius: 24, padding: "24px 20px",
          display: "flex", alignItems: "center", gap: 24,
          boxShadow: "0 8px 48px rgba(0,0,0,0.4)",
        }}>
          <LifeIndexRing score={data.lifeIndex} label="Life Index" />

          <div style={{ flex: 1 }}>
            <p style={{ fontFamily: "var(--font-newsreader), serif", fontSize: 20, fontWeight: 400, color: "#ede9fe", lineHeight: 1.4, marginBottom: 10 }}>
              {data.lifeIndexLabel}
            </p>
            {/* Current phase chip */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(124,58,237,0.12)", border: "1px solid rgba(167,139,250,0.2)",
              borderRadius: 999, padding: "5px 12px", marginBottom: 8,
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 8px #a78bfa", display: "block" }} />
              <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 10, fontWeight: 600, color: "#c4b5fd", letterSpacing: "0.06em" }}>
                {data.currentPhase}
              </span>
            </div>
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 11, color: "#5c4a7a", lineHeight: 1.5 }}>
              {data.currentPhaseExplainer}
            </p>
          </div>
        </div>

        {/* ── Radar chart ── */}
        <div style={{
          background: "rgba(20,10,45,0.4)",
          border: "1px solid rgba(167,139,250,0.08)",
          borderRadius: 24, padding: "24px 16px 16px",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#5c4a7a", marginBottom: 8 }}>
            Your Life Balance — Tap any area
          </p>
          <LifeRadarChart
            areas={data.areas}
            onSelect={setSelectedArea}
            potentialAreas={data.areas.map(a => ({ id: a.id, score: Math.min(93, a.score + 26) }))}
          />
          {/* Legend */}
          <div style={{ display: "flex", gap: 16, marginTop: 12 }}>
            {[["#4ade80","Strong"],["#fbbf24","Moderate"],["#f87171","Attention"]].map(([col,lbl]) => (
              <div key={lbl} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: col }} />
                <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, color: "#5c4a7a", letterSpacing: "0.06em" }}>{lbl}</span>
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 14, height: 2, borderTop: "2px dashed rgba(251,191,36,0.6)" }} />
              <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, color: "#5c4a7a", letterSpacing: "0.06em" }}>Your potential</span>
            </div>
          </div>
        </div>

        {/* ── Consultation upsell card ── */}
        <ConsultationCard avgScore={Math.round(data.areas.reduce((s, a) => s + a.score, 0) / data.areas.length)} />

        {/* ── 30-Day Outlook ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#5c4a7a" }}>
            Next 30 Days
          </p>
          <div style={{
            background: "rgba(20,10,45,0.4)", border: "1px solid rgba(167,139,250,0.08)",
            borderRadius: 20, overflow: "hidden",
          }}>
            {data.areas.map((area, i) => {
              const col = scoreColor(area.score);
              const icon = AREA_ICONS[area.id] ?? "◇";
              return (
                <button
                  key={area.id}
                  onClick={() => setSelectedArea(area)}
                  style={{
                    width: "100%", display: "flex", alignItems: "center",
                    padding: "13px 16px", gap: 14,
                    background: "transparent", border: "none", cursor: "pointer",
                    borderTop: i > 0 ? "1px solid rgba(167,139,250,0.05)" : "none",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 13, color: col.text, width: 16, textAlign: "center", flexShrink: 0 }}>{icon}</span>
                  <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 12, fontWeight: 600, color: "#cdc5e8", flex: 1 }}>
                    {area.label}
                  </span>
                  <TrendArrow trend={area.trend} />
                  <span style={{
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: 9, fontWeight: 600, letterSpacing: "0.1em",
                    color: area.trend === "up" ? "#4ade80" : area.trend === "down" ? "#f87171" : "#fbbf24",
                    textTransform: "uppercase",
                  }}>
                    {area.trend === "up" ? "Improving" : area.trend === "down" ? "Declining" : "Stable"}
                  </span>
                  <span style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, color: "#5c4a7a" }}>›</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.22em", textTransform: "uppercase", color: "#5c4a7a" }}>
            Your Actions This Month
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.areas.map((area) => {
              const col  = scoreColor(area.score);
              const icon = AREA_ICONS[area.id] ?? "◇";
              return (
                <div
                  key={area.id}
                  style={{
                    display: "flex", alignItems: "flex-start", gap: 12,
                    background: "rgba(20,10,45,0.4)", border: "1px solid rgba(167,139,250,0.07)",
                    borderRadius: 16, padding: "13px 14px",
                  }}
                >
                  <span style={{ fontSize: 13, color: col.text, marginTop: 1, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: col.text, marginBottom: 3 }}>
                      {area.label}
                    </p>
                    <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 13, fontWeight: 500, color: "#cdc5e8", lineHeight: 1.5 }}>
                      {area.action}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Refresh hint */}
        <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: 10, color: "#3d2a5c", textAlign: "center" }}>
          Insights refresh daily · Tap any area for details
        </p>
      </div>

      {/* Area detail sheet */}
      {selectedArea && (
        <AreaSheet area={selectedArea} onClose={() => setSelectedArea(null)} />
      )}
    </>
  );
}
