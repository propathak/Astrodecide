"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

interface QuotaInfo {
  freeQuestionsUsed: number;
  paymentStatus: string;
  passExpiresAt: string | null;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);

  useEffect(() => {
    fetch("/api/quota")
      .then((r) => r.json())
      .then(setQuota)
      .catch(() => {});
  }, []);

  async function handleReset() {
    document.cookie = "astro_profile=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/onboarding");
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/auth/signin" });
  }

  const isPaid =
    quota?.paymentStatus === "active" &&
    quota?.passExpiresAt &&
    new Date(quota.passExpiresAt) > new Date();

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
          fontFamily: "var(--font-inter), sans-serif",
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
          fontFamily: "var(--font-playfair), serif",
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

      {/* Account info */}
      {session?.user && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ height: "1px", background: "#1A1A1A" }} />
          <div style={{ padding: "24px 0", display: "flex", alignItems: "center", gap: "14px" }}>
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={40}
                height={40}
                style={{ borderRadius: "50%", border: "1px solid rgba(255,255,255,0.1)" }}
              />
            )}
            <div>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "14px",
                  color: "#ffffff",
                  marginBottom: "2px",
                }}
              >
                {session.user.name}
              </p>
              <p
                style={{
                  fontFamily: "var(--font-inter), sans-serif",
                  fontSize: "12px",
                  color: "#666666",
                }}
              >
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription status */}
      {quota && (
        <div style={{ marginBottom: "32px" }}>
          <div style={{ height: "1px", background: "#1A1A1A" }} />
          <div style={{ padding: "24px 0" }}>
            <p
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "10px",
                fontWeight: 300,
                letterSpacing: "0.2em",
                color: "#888888",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Access
            </p>
            {isPaid ? (
              <div
                style={{
                  background: "rgba(52,211,153,0.06)",
                  border: "1px solid rgba(52,211,153,0.15)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
              >
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#34d399" }}>
                  ✦ Unlimited pass active
                </p>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", color: "#666", marginTop: "4px" }}>
                  Expires {new Date(quota.passExpiresAt!).toLocaleString()}
                </p>
              </div>
            ) : (
              <div
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                }}
              >
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "13px", color: "#aaa" }}>
                  {3 - (quota.freeQuestionsUsed ?? 0)} of 3 free questions remaining
                </p>
                <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "11px", color: "#555", marginTop: "4px" }}>
                  Upgrade for ₹50/day unlimited access
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* About */}
      <div>
        <div style={{ height: "1px", background: "#1A1A1A" }} />
        <div style={{ padding: "24px 0" }}>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "10px",
              fontWeight: 300,
              letterSpacing: "0.2em",
              color: "#888888",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            About ALIA
          </p>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              lineHeight: 1.75,
              color: "#444444",
            }}
          >
            ALIA is your personal Vedic astrologer, powered by birth chart data and current transits.
          </p>
        </div>
      </div>

      <div style={{ height: "1px", background: "#1A1A1A", margin: "16px 0" }} />

      {/* Actions */}
      <div style={{ paddingTop: "32px", display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
        <button
          onClick={handleReset}
          style={{
            background: "transparent",
            border: "none",
            fontFamily: "var(--font-inter), sans-serif",
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

        <button
          onClick={handleSignOut}
          style={{
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "10px",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "13px",
            fontWeight: 300,
            color: "#666",
            cursor: "pointer",
            padding: "10px 24px",
          }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
