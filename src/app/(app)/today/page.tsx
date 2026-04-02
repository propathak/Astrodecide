"use client";

import { useEffect, useState } from "react";
import PlanetGlyph from "@/components/PlanetGlyph";
import StarLoader from "@/components/StarLoader";

interface Insight {
  id: string;
  text: string;
  planet: string;
  house: number;
  category: string;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).toUpperCase();
}

export default function TodayPage() {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/daily")
      .then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
      })
      .then((data) => setInsights(data.insights ?? []))
      .catch(() => setError("Could not load today's insights."))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#000000",
        paddingTop: "64px",
        paddingBottom: "96px",
      }}
    >
      {/* Date header */}
      <div style={{ textAlign: "center", marginBottom: "64px" }}>
        <p
          style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "9px",
            fontWeight: 300,
            letterSpacing: "0.2em",
            color: "#444444",
            textTransform: "uppercase",
          }}
        >
          {formatDate(today)}
        </p>
      </div>

      {loading ? (
        <div style={{ padding: "0 24px" }}>
          <StarLoader label="Reading the sky..." />
        </div>
      ) : error ? (
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "18px",
              fontWeight: 300,
              color: "#888888",
              lineHeight: 1.8,
            }}
          >
            {error}
          </p>
          <p
            style={{
              marginTop: "16px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: 300,
              letterSpacing: "0.15em",
              color: "#444444",
              textTransform: "uppercase",
            }}
          >
            Set up your chart first →
          </p>
        </div>
      ) : insights.length === 0 ? (
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <p
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: "20px",
              fontWeight: 300,
              color: "#888888",
              lineHeight: 1.8,
              fontStyle: "italic",
            }}
          >
            Your chart is still being mapped.
          </p>
          <p
            style={{
              marginTop: "32px",
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: 300,
              letterSpacing: "0.2em",
              color: "#444444",
              textTransform: "uppercase",
            }}
          >
            Complete your profile to begin
          </p>
        </div>
      ) : (
        <div>
          {insights.map((insight, i) => (
            <div key={insight.id}>
              {/* Insight block */}
              <div
                style={{
                  padding: "48px 32px",
                  textAlign: "center",
                }}
              >
                <p
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: "20px",
                    fontWeight: 300,
                    lineHeight: 1.75,
                    letterSpacing: "0.02em",
                    color: "#ffffff",
                    maxWidth: "340px",
                    margin: "0 auto",
                  }}
                >
                  {insight.text.replace(/\*\*(.*?)\*\*/g, "$1").replace(/__(.*?)__/g, "$1")}
                </p>
                <div
                  style={{
                    marginTop: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <PlanetGlyph planet={insight.planet} size={14} color="#444444" />
                  <span
                    style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: "10px",
                      fontWeight: 300,
                      letterSpacing: "0.15em",
                      color: "#444444",
                      textTransform: "uppercase",
                    }}
                  >
                    {insight.planet} in house {insight.house}
                  </span>
                  {insight.category && (
                    <>
                      <span style={{ color: "#1A1A1A" }}>·</span>
                      <span
                        style={{
                          fontFamily: "'Inter', sans-serif",
                          fontSize: "10px",
                          fontWeight: 300,
                          letterSpacing: "0.15em",
                          color: "#444444",
                          textTransform: "uppercase",
                        }}
                      >
                        {insight.category}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {/* Divider between insights */}
              {i < insights.length - 1 && (
                <div style={{ height: "1px", background: "#1A1A1A", margin: "0 32px" }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
