"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const OFFER_SECONDS = 10 * 60; // 10 minutes

type Plan = "daily" | "weekly" | "monthly" | "yearly";

const PLANS: Record<Plan, { label: string; duration: string; price: string; original: string; saving: string; popular?: boolean }> = {
  daily:   { label: "24 Hours",  duration: "24-hour access",   price: "₹49",    original: "₹99",    saving: "50% off" },
  weekly:  { label: "1 Week",    duration: "7-day access",     price: "₹299",   original: "₹599",   saving: "50% off", popular: true },
  monthly: { label: "1 Month",   duration: "30-day access",    price: "₹499",   original: "₹999",   saving: "50% off" },
  yearly:  { label: "1 Year",    duration: "365-day access",   price: "₹1,999", original: "₹3,999", saving: "Best value" },
};

function getOrSetExpiry(): number {
  try {
    const key = "alia_offer_expiry";
    const stored = sessionStorage.getItem(key);
    const now = Math.floor(Date.now() / 1000);
    if (stored) {
      const expiry = parseInt(stored, 10);
      if (expiry > now) return expiry;
    }
    const expiry = now + OFFER_SECONDS;
    sessionStorage.setItem(key, String(expiry));
    return expiry;
  } catch {
    return Math.floor(Date.now() / 1000) + OFFER_SECONDS;
  }
}

interface PaywallModalProps {
  onClose: () => void;
  onUnlocked: (passExpiresAt: string) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string; amount: number; currency: string;
  name: string; description: string; order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}
interface RazorpayInstance { open: () => void; }
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function PaywallModal({ onClose, onUnlocked }: PaywallModalProps) {
  const { data: session } = useSession();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("weekly");
  const [loading,       setLoading]     = useState(false);
  const [error,         setError]       = useState("");
  const [secsLeft,      setSecsLeft]    = useState(OFFER_SECONDS);
  const [couponCode,    setCouponCode]  = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState("");
  const expiryRef = useRef<number>(0);

  useEffect(() => {
    expiryRef.current = getOrSetExpiry();
    const tick = () => {
      const remaining = expiryRef.current - Math.floor(Date.now() / 1000);
      setSecsLeft(Math.max(0, remaining));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const expired = secsLeft === 0;
  const mins    = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const secs    = String(secsLeft % 60).padStart(2, "0");
  const pct     = Math.round((secsLeft / OFFER_SECONDS) * 100);

  async function handleUnlock() {
    setLoading(true);
    setError("");
    try {
      if (!window.Razorpay) await loadRazorpayScript();

      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      if (!orderRes.ok) throw new Error("Failed to create payment order");
      const { orderId, amount, currency, keyId } = await orderRes.json();

      await new Promise<void>((resolve, reject) => {
        const plan = PLANS[selectedPlan];
        const rzp = new window.Razorpay({
          key: keyId, amount, currency,
          name: "AstroDecide",
          description: plan.duration,
          order_id: orderId,
          prefill: {
            name:  session?.user?.name  ?? "",
            email: session?.user?.email ?? "",
          },
          theme: { color: "#7c3aed" },
          handler: async (response) => {
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId:   response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                }),
              });
              if (!verifyRes.ok) { reject(new Error("Payment verification failed")); return; }
              const { passExpiresAt } = await verifyRes.json();
              onUnlocked(passExpiresAt);
              resolve();
            } catch (err) { reject(err); }
          },
          modal: { ondismiss: () => setLoading(false) },
        });
        rzp.open();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  }

  async function handleCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    try {
      const res = await fetch("/api/coupon/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setCouponError(data.error ?? "Invalid coupon"); setCouponLoading(false); return; }
      onUnlocked(data.passExpiresAt);
    } catch {
      setCouponError("Something went wrong. Try again.");
      setCouponLoading(false);
    }
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.head.appendChild(script);
    });
  }

  const activePlan = PLANS[selectedPlan];

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "rgba(12,6,26,0.98)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(167,139,250,0.1)",
          borderRadius: "28px 28px 0 0",
          padding: "20px 20px 40px",
          width: "100%", maxWidth: "430px",
          animation: "slideUp 320ms cubic-bezier(0.16,1,0.3,1)",
          overflowY: "auto", maxHeight: "92dvh",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", margin: "0 auto 18px" }} />

        {/* Heading */}
        <h2 style={{
          fontFamily: "var(--font-newsreader), serif",
          fontSize: "26px", fontWeight: 400,
          color: "#fff", textAlign: "center", lineHeight: 1.2, marginBottom: "6px",
        }}>
          The stars have more to say.
        </h2>
        <p style={{
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: "13px", color: "#5c4a7a",
          textAlign: "center", marginBottom: "18px",
        }}>
          Pick a pass. Unlimited questions, full chart depth.
        </p>

        {/* Countdown */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: expired ? "rgba(255,107,53,0.06)" : "rgba(124,58,237,0.06)",
          border: `1px solid ${expired ? "rgba(255,107,53,0.2)" : "rgba(167,139,250,0.12)"}`,
          borderRadius: "12px", padding: "10px 14px", marginBottom: "18px",
        }}>
          <span style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: expired ? "#ff6b35" : "#5c4a7a",
          }}>
            {expired ? "⚠ Offer ending" : "⏱ Offer expires in"}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "18px", fontWeight: 700,
              color: expired ? "#ff6b35" : "#fff",
              fontVariantNumeric: "tabular-nums",
            }}>
              {expired ? "00:00" : `${mins}:${secs}`}
            </span>
            <div style={{ width: "60px", height: "3px", borderRadius: "999px", background: "rgba(255,255,255,0.06)" }}>
              <div style={{
                height: "100%", borderRadius: "999px", width: `${pct}%`,
                background: expired ? "#ff6b35" : pct > 40 ? "linear-gradient(90deg, #7c3aed, #a78bfa)" : "linear-gradient(90deg, #ffb347, #ff6b35)",
                transition: "width 1s linear",
              }} />
            </div>
          </div>
        </div>

        {/* Plan selector */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {(Object.entries(PLANS) as [Plan, typeof PLANS[Plan]][]).map(([key, plan]) => {
            const active = selectedPlan === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedPlan(key)}
                style={{
                  position: "relative",
                  padding: "12px 10px",
                  background: active ? "rgba(124,58,237,0.18)" : "rgba(20,10,45,0.5)",
                  border: `1.5px solid ${active ? "rgba(167,139,250,0.55)" : "rgba(167,139,250,0.08)"}`,
                  borderRadius: "16px", cursor: "pointer",
                  textAlign: "left",
                  transition: "all 160ms ease",
                  boxShadow: active ? "0 0 18px rgba(124,58,237,0.2)" : "none",
                }}
              >
                {plan.popular && (
                  <span style={{
                    position: "absolute", top: "-9px", left: "50%",
                    transform: "translateX(-50%)",
                    background: "linear-gradient(90deg, #7c3aed, #a78bfa)",
                    borderRadius: "999px", padding: "2px 10px",
                    fontFamily: "var(--font-space-grotesk), sans-serif",
                    fontSize: "8px", fontWeight: 700,
                    letterSpacing: "0.14em", color: "#fff",
                    whiteSpace: "nowrap",
                  }}>
                    MOST POPULAR
                  </span>
                )}
                <p style={{
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: "12px", fontWeight: 700,
                  color: active ? "#ede9fe" : "#cdc5e8",
                  marginBottom: "4px",
                }}>{plan.label}</p>
                <p style={{
                  fontFamily: "var(--font-newsreader), serif",
                  fontSize: "22px", fontWeight: 400,
                  color: active ? "#fff" : "#a394c0",
                  lineHeight: 1, marginBottom: "2px",
                }}>{plan.price}</p>
                <p style={{
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: "9px", color: "#5c4a7a",
                  textDecoration: "line-through",
                }}>{plan.original}</p>
                <span style={{
                  display: "inline-block", marginTop: "4px",
                  background: active ? "rgba(167,139,250,0.15)" : "rgba(255,107,53,0.1)",
                  border: `1px solid ${active ? "rgba(167,139,250,0.3)" : "rgba(255,107,53,0.2)"}`,
                  borderRadius: "999px", padding: "2px 8px",
                  fontFamily: "var(--font-space-grotesk), sans-serif",
                  fontSize: "9px", fontWeight: 600, letterSpacing: "0.08em",
                  color: active ? "#a78bfa" : "#ff8c55",
                }}>{plan.saving}</span>
              </button>
            );
          })}
        </div>

        {/* Features */}
        <div style={{ marginBottom: "16px", display: "flex", flexDirection: "column", gap: "7px" }}>
          {[
            "✦  Unlimited questions",
            "◎  Confidence scores + timing windows",
            "◇  Do / Avoid / Wait action plan",
          ].map((f) => (
            <p key={f} style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "12px", color: "#5c4a7a",
            }}>{f}</p>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleUnlock}
          disabled={loading}
          style={{
            width: "100%", padding: "15px",
            background: loading ? "rgba(124,58,237,0.4)" : "linear-gradient(135deg, #7c3aed, #a78bfa)",
            border: "none", borderRadius: "999px",
            color: "#fff",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "14px", fontWeight: 700, letterSpacing: "0.06em",
            cursor: loading ? "default" : "pointer",
            boxShadow: loading ? "none" : "0 4px 28px rgba(124,58,237,0.45)",
            transition: "all 200ms ease",
            marginBottom: "12px",
          }}
        >
          {loading ? "Opening payment…" : `✦  Unlock for ${activePlan.price}`}
        </button>
        {error && (
          <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "11px", color: "#ff716c", textAlign: "center", marginBottom: "10px" }}>
            {error}
          </p>
        )}

        {/* Coupon */}
        <div style={{ marginTop: "4px" }}>
          <p style={{
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "10px", fontWeight: 600, letterSpacing: "0.16em",
            textTransform: "uppercase", color: "#3d2a5c",
            marginBottom: "8px", textAlign: "center",
          }}>Have a coupon?</p>
          <div style={{
            display: "flex", gap: "8px", alignItems: "center",
            background: "rgba(20,10,45,0.5)",
            border: `1px solid ${couponError ? "rgba(255,113,108,0.3)" : "rgba(167,139,250,0.1)"}`,
            borderRadius: "12px", padding: "4px 4px 4px 14px",
          }}>
            <input
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCoupon()}
              placeholder="Enter code…"
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#fff", padding: "10px 0",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "13px", fontWeight: 500, letterSpacing: "0.1em",
              }}
            />
            <button
              onClick={handleCoupon}
              disabled={couponLoading || !couponCode.trim()}
              style={{
                padding: "9px 16px", borderRadius: "9px",
                background: couponCode.trim() ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${couponCode.trim() ? "rgba(167,139,250,0.28)" : "transparent"}`,
                color: couponCode.trim() ? "#a78bfa" : "#3d2a5c",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "12px", fontWeight: 600,
                cursor: couponCode.trim() && !couponLoading ? "pointer" : "default",
                flexShrink: 0,
              }}
            >
              {couponLoading ? "…" : "Apply"}
            </button>
          </div>
          {couponError && (
            <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "11px", color: "#ff716c", textAlign: "center", marginTop: "6px" }}>
              {couponError}
            </p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "10px", marginTop: "8px",
            background: "transparent", border: "none",
            color: "#3d2a5c",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "12px", cursor: "pointer",
          }}
        >
          {expired ? "Close" : "Maybe later"}
        </button>
      </div>
    </div>
  );
}
