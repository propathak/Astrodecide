"use client";

import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();

  async function handleReset() {
    // Clear astro profile cookie
    document.cookie = "astro_profile=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/onboarding");
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#000000",
        padding: "64px 32px",
        maxWidth: "420px",
        margin: "0 auto",
      }}
    >
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          background: "transparent",
          border: "none",
          color: "#888888",
          fontFamily: "'Inter', sans-serif",
          fontSize: "16px",
          cursor: "pointer",
          marginBottom: "48px",
          padding: 0,
        }}
      >
        ←
      </button>

      <h1
        style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: "28px",
          fontWeight: 300,
          textAlign: "center",
          letterSpacing: "0.05em",
          marginBottom: "64px",
          color: "#ffffff",
        }}
      >
        Settings
      </h1>

      {/* Settings items */}
      <div>
        {[
          {
            label: "About ALIA",
            desc: "ALIA is your personal Vedic astrologer, powered by birth chart data and current transits.",
          },
        ].map((item) => (
          <div key={item.label}>
            <div style={{ height: "1px", background: "#1A1A1A" }} />
            <div style={{ padding: "24px 0" }}>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "10px",
                  fontWeight: 300,
                  letterSpacing: "0.2em",
                  color: "#888888",
                  textTransform: "uppercase",
                  marginBottom: "8px",
                }}
              >
                {item.label}
              </p>
              <p
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: "13px",
                  fontWeight: 300,
                  lineHeight: 1.75,
                  color: "#444444",
                }}
              >
                {item.desc}
              </p>
            </div>
          </div>
        ))}

        <div style={{ height: "1px", background: "#1A1A1A", margin: "16px 0" }} />

        <div style={{ paddingTop: "32px", textAlign: "center" }}>
          <button
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "none",
              fontFamily: "'Inter', sans-serif",
              fontSize: "10px",
              fontWeight: 300,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#444444",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Reset Birth Data
          </button>
        </div>
      </div>
    </div>
  );
}
