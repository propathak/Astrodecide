"use client";

import { useEffect, useState } from "react";
import ChartWheel from "@/components/ChartWheel";
import PlanetGlyph from "@/components/PlanetGlyph";

interface PlanetRow {
  planet: string;
  sign: string;
  house: number;
  nakshatra: string;
  degree: string;
  retrograde?: boolean;
}

interface ChartData {
  planets: PlanetRow[];
  ascendant: { sign: string; degree: string };
  sun: { sign: string };
  moon: { sign: string };
}

interface BottomSheet {
  planet: PlanetRow;
  interpretation: string;
}

export default function ChartPage() {
  const [view, setView] = useState<"wheel" | "table">("wheel");
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [bottomSheet, setBottomSheet] = useState<BottomSheet | null>(null);
  const [sheetLoading, setSheetLoading] = useState(false);

  useEffect(() => {
    fetch("/api/chart")
      .then((r) => r.json())
      .then((d) => setChartData(d.chart ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function openPlanet(planet: PlanetRow) {
    setBottomSheet({ planet, interpretation: "" });
    setSheetLoading(true);
    try {
      const res = await fetch("/api/chart/interpret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planet: planet.planet }),
      });
      const d = await res.json();
      setBottomSheet({
        planet,
        interpretation: (d.interpretation ?? "").replace(/\*\*(.*?)\*\*/g, "$1"),
      });
    } catch {
      setBottomSheet({ planet, interpretation: "Unable to load interpretation." });
    } finally {
      setSheetLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100dvh", paddingTop: "52px" }}>
      {/* Toggle */}
      <div style={{ textAlign: "center", marginBottom: "36px" }}>
        {["wheel", "table"].map((v, i) => (
          <span key={v}>
            {i === 1 && (
              <span style={{ color: "rgba(255,255,255,0.08)", margin: "0 12px" }}>·</span>
            )}
            <span
              onClick={() => setView(v as "wheel" | "table")}
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                color: view === v ? "#ffffff" : "#3D3D52",
                textDecoration: view === v ? "underline" : "none",
                textUnderlineOffset: "4px",
                transition: "color 150ms ease",
              }}
            >
              {v.toUpperCase()}
            </span>
          </span>
        ))}
      </div>

      {loading ? (
        <div
          style={{
            display: "flex",
            gap: "5px",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 0",
          }}
        >
          {[0, 1, 2].map((i) => (
            <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      ) : !chartData ? (
        <div style={{ textAlign: "center", padding: "0 32px" }}>
          <p
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "18px",
              fontWeight: 400,
              color: "#9090A8",
              lineHeight: 1.75,
            }}
          >
            No chart found.
          </p>
        </div>
      ) : view === "wheel" ? (
        <div style={{ padding: "0 24px" }}>
          <ChartWheel
            planets={chartData.planets.map((p) => ({
              planet: p.planet,
              sign: p.sign,
              degree: parseFloat(p.degree) || 0,
              house: p.house,
            }))}
            ascendantSign={chartData.ascendant.sign}
          />
          <p
            style={{
              textAlign: "center",
              marginTop: "28px",
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "10px",
              fontWeight: 300,
              letterSpacing: "0.16em",
              color: "#3D3D52",
              textTransform: "uppercase",
            }}
          >
            Tap a planet in table view for interpretation
          </p>
        </div>
      ) : (
        <div style={{ padding: "0 20px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 36px 1fr",
              paddingBottom: "10px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              gap: "8px",
            }}
          >
            {["Planet", "Sign", "H", "Nakshatra"].map((h) => (
              <span key={h} className="label" style={{ fontSize: "9px" }}>
                {h}
              </span>
            ))}
          </div>

          {chartData.planets.map((row, i) => (
            <div
              key={i}
              onClick={() => openPlanet(row)}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 36px 1fr",
                padding: "15px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "7px" }}>
                <PlanetGlyph planet={row.planet} size={12} color="#9090A8" />
                <span
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontSize: "13px",
                    fontWeight: 300,
                    color: "#ffffff",
                  }}
                >
                  {row.planet}
                  {row.retrograde && (
                    <span style={{ color: "#3D3D52", marginLeft: "4px", fontSize: "10px" }}>
                      ℞
                    </span>
                  )}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                  color: "#9090A8",
                  alignSelf: "center",
                }}
              >
                {row.sign}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                  color: "#3D3D52",
                  alignSelf: "center",
                }}
              >
                {row.house}
              </span>
              <span
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "11px",
                  fontWeight: 300,
                  color: "#3D3D52",
                  alignSelf: "center",
                }}
              >
                {row.nakshatra}
              </span>
            </div>
          ))}
        </div>
      )}

      {bottomSheet && (
        <>
          <div
            onClick={() => setBottomSheet(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              zIndex: 40,
            }}
          />
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: 0,
              right: 0,
              background: "rgba(10,10,22,0.97)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderTop: "1px solid rgba(139,92,246,0.25)",
              zIndex: 50,
              padding: "20px 28px 56px",
              maxWidth: "430px",
              margin: "0 auto",
              animation: "slideUp 280ms ease-out",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "3px",
                background: "rgba(255,255,255,0.12)",
                borderRadius: "999px",
                margin: "0 auto 24px",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "20px",
              }}
            >
              <PlanetGlyph planet={bottomSheet.planet.planet} size={15} color="#9090A8" />
              <span className="label" style={{ fontSize: "10px" }}>
                {bottomSheet.planet.planet} in {bottomSheet.planet.sign}, House{" "}
                {bottomSheet.planet.house}
              </span>
            </div>

            {sheetLoading ? (
              <div
                style={{
                  display: "flex",
                  gap: "5px",
                  justifyContent: "center",
                  padding: "16px 0",
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
            ) : (
              <p
                style={{
                  fontFamily: "var(--font-playfair), serif",
                  fontSize: "17px",
                  fontWeight: 400,
                  lineHeight: 1.8,
                  textAlign: "center",
                  color: "#ffffff",
                }}
              >
                {bottomSheet.interpretation}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
