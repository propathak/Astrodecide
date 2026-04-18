"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

const OFFER_SECONDS = 10 * 60; // 10 minutes

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
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [secsLeft,    setSecsLeft]    = useState(OFFER_SECONDS);
  const [couponCode,  setCouponCode]  = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError,   setCouponError]   = useState("");
  const expiryRef = useRef<number>(0);

  // Initialise timer once on mount
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

      const orderRes = await fetch("/api/payment/create-order", { method: "POST" });
      if (!orderRes.ok) throw new Error("Failed to create payment order");
      const { orderId, amount, currency, keyId } = await orderRes.json();

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId, amount, currency,
          name: "AstroDecide",
          description: "Unlimited questions for 24 hours",
          order_id: orderId,
          prefill: {
            name: session?.user?.name ?? "",
            email: session?.user?.email ?? "",
          },
          theme: { color: "#81ecff" },
          handler: async (response) => {
            try {
              const verifyRes = await fetch("/api/payment/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  orderId: response.razorpay_order_id,
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
      if (!res.ok) {
        setCouponError(data.error ?? "Invalid coupon");
        setCouponLoading(false);
        return;
      }
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

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: "rgba(14,14,14,0.97)",
          backdropFilter: "blur(28px)", WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "28px 28px 0 0",
          padding: "24px 24px 44px",
          width: "100%", maxWidth: "430px",
          animation: "slideUp 320ms cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: "36px", height: "4px", background: "rgba(255,255,255,0.1)", borderRadius: "2px", margin: "0 auto 20px" }} />

        {/* ── Limited offer badge ── */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
          <span style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "10px", fontWeight: 700,
            letterSpacing: "0.22em", textTransform: "uppercase",
            color: "#ff6b35",
            background: "rgba(255,107,53,0.12)",
            border: "1px solid rgba(255,107,53,0.3)",
            borderRadius: "999px", padding: "5px 14px",
          }}>
            ✦ Limited-time offer
          </span>
        </div>

        {/* ── Heading ── */}
        <h2 style={{
          fontFamily: "var(--font-newsreader), serif",
          fontSize: "28px", fontWeight: 400,
          color: "#fff", textAlign: "center",
          lineHeight: 1.2, marginBottom: "8px",
        }}>
          The stars have more to say.
        </h2>
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "13px", fontWeight: 300,
          color: "#777575", textAlign: "center",
          lineHeight: 1.6, marginBottom: "22px",
        }}>
          You&apos;ve had your first glimpse. Unlock a full day<br />of unlimited cosmic guidance.
        </p>

        {/* ── Countdown timer ── */}
        <div style={{
          background: expired ? "rgba(255,107,53,0.06)" : "rgba(124,58,237,0.07)",
          border: `1px solid ${expired ? "rgba(255,107,53,0.25)" : "rgba(167,139,250,0.16)"}`,
          borderRadius: "16px", padding: "14px 16px 12px",
          marginBottom: "18px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
            <span style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "10px", fontWeight: 600,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: expired ? "#ff6b35" : "#adaaaa",
            }}>
              {expired ? "⚠ Offer ending" : "⏱ Offer expires in"}
            </span>
            <span style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "22px", fontWeight: 700,
              letterSpacing: "0.06em",
              color: expired ? "#ff6b35" : "#ffffff",
              fontVariantNumeric: "tabular-nums",
            }}>
              {expired ? "00:00" : `${mins}:${secs}`}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{
            height: "3px", borderRadius: "999px",
            background: "rgba(255,255,255,0.06)", overflow: "hidden",
          }}>
            <div style={{
              height: "100%", borderRadius: "999px",
              width: `${pct}%`,
              background: expired
                ? "#ff6b35"
                : pct > 40
                  ? "linear-gradient(90deg, #7c3aed, #a78bfa)"
                  : "linear-gradient(90deg, #ffb347, #ff6b35)",
              transition: "width 1s linear",
            }} />
          </div>
        </div>

        {/* ── Price card ── */}
        <div style={{
          background: "rgba(38,38,38,0.4)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: "20px", padding: "18px 20px",
          marginBottom: "18px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <p style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "10px", fontWeight: 600,
              letterSpacing: "0.2em", textTransform: "uppercase",
              color: "#a78bfa", marginBottom: "6px",
            }}>
              24-hour unlimited pass
            </p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
              {/* Strikethrough original */}
              <span style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "16px", fontWeight: 400,
                color: "#494847",
                textDecoration: "line-through",
              }}>₹100</span>
              {/* Final price */}
              <span style={{
                fontFamily: "var(--font-newsreader), serif",
                fontSize: "38px", fontWeight: 400,
                color: "#ffffff", lineHeight: 1,
              }}>₹50</span>
            </div>
            <p style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "11px", fontWeight: 300,
              color: "#494847", marginTop: "4px",
            }}>
              Unlimited questions · Valid 24 hours
            </p>
          </div>
          {/* 50% OFF badge */}
          <div style={{
            background: "linear-gradient(135deg, #ff6b35, #ff3b6e)",
            borderRadius: "12px", padding: "8px 12px",
            textAlign: "center", flexShrink: 0,
            boxShadow: "0 4px 16px rgba(255,107,53,0.3)",
          }}>
            <p style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "18px", fontWeight: 800,
              color: "#fff", lineHeight: 1,
            }}>50%</p>
            <p style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "9px", fontWeight: 600,
              color: "rgba(255,255,255,0.85)", letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}>OFF</p>
          </div>
        </div>

        {/* ── Feature list ── */}
        <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            { icon: "✦", text: "Unlimited questions for the full day" },
            { icon: "◎", text: "Confidence scores + best timing windows" },
            { icon: "◇", text: "Do / Avoid / Wait cosmic action plan" },
          ].map((f) => (
            <div key={f.text} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{ color: "#a78bfa", fontSize: "11px", flexShrink: 0 }}>{f.icon}</span>
              <span style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "12px", fontWeight: 300, color: "#adaaaa",
              }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* ── CTA — payments coming soon ── */}
        <div style={{
          width: "100%", padding: "15px",
          background: "rgba(38,38,38,0.35)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "999px",
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "13px", fontWeight: 500,
            color: "#494847", letterSpacing: "0.04em",
            margin: 0,
          }}>
            💳 &nbsp;Online payments coming soon
          </p>
        </div>

        {/* ── Coupon code — always visible ── */}
        <div style={{ marginTop: "12px" }}>
          <p style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "10px", fontWeight: 600,
            letterSpacing: "0.18em", textTransform: "uppercase",
            color: "#494847", marginBottom: "8px", textAlign: "center",
          }}>
            Have a coupon?
          </p>
          <div style={{
            display: "flex", gap: "8px", alignItems: "center",
            background: "rgba(38,38,38,0.5)",
            border: `1px solid ${couponError ? "rgba(255,113,108,0.3)" : "rgba(255,255,255,0.08)"}`,
            borderRadius: "12px", padding: "4px 4px 4px 14px",
            transition: "border-color 150ms ease",
          }}>
            <input
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCoupon()}
              placeholder="Enter code..."
              style={{
                flex: 1, background: "transparent", border: "none",
                color: "#fff", padding: "10px 0",
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "13px", fontWeight: 500,
                letterSpacing: "0.1em",
              }}
            />
            <button
              onClick={handleCoupon}
              disabled={couponLoading || !couponCode.trim()}
              style={{
                padding: "9px 16px", borderRadius: "9px",
                background: couponCode.trim() ? "rgba(167,139,250,0.12)" : "transparent",
                border: `1px solid ${couponCode.trim() ? "rgba(167,139,250,0.28)" : "transparent"}`,
                color: couponCode.trim() ? "#a78bfa" : "#494847",
                fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
                fontSize: "12px", fontWeight: 600,
                cursor: couponCode.trim() && !couponLoading ? "pointer" : "default",
                transition: "all 150ms ease", flexShrink: 0,
              }}
            >
              {couponLoading ? "…" : "Apply"}
            </button>
          </div>
          {couponError && (
            <p style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "11px", color: "#ff716c",
              textAlign: "center", marginTop: "6px",
            }}>{couponError}</p>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            width: "100%", padding: "10px", marginTop: "8px",
            background: "transparent", border: "none",
            color: "#494847",
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "12px", fontWeight: 400,
            cursor: "pointer", letterSpacing: "0.04em",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
