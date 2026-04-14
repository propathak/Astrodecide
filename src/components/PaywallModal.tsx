"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";

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
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string };
  theme: { color: string };
  handler: (response: RazorpayResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export default function PaywallModal({ onClose, onUnlocked }: PaywallModalProps) {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleUnlock() {
    setLoading(true);
    setError("");

    try {
      // Load Razorpay script
      if (!window.Razorpay) {
        await loadRazorpayScript();
      }

      // Create order
      const orderRes = await fetch("/api/payment/create-order", {
        method: "POST",
      });

      if (!orderRes.ok) {
        throw new Error("Failed to create payment order");
      }

      const { orderId, amount, currency, keyId } = await orderRes.json();

      // Open Razorpay checkout
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: keyId,
          amount,
          currency,
          name: "AstroDecide",
          description: "Unlimited questions for 24 hours",
          order_id: orderId,
          prefill: {
            name: session?.user?.name ?? "",
            email: session?.user?.email ?? "",
          },
          theme: { color: "#8b5cf6" },
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

              if (!verifyRes.ok) {
                reject(new Error("Payment verification failed"));
                return;
              }

              const { passExpiresAt } = await verifyRes.json();
              onUnlocked(passExpiresAt);
              resolve();
            } catch (err) {
              reject(err);
            }
          },
          modal: {
            ondismiss: () => {
              setLoading(false);
            },
          },
        });

        rzp.open();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setLoading(false);
    }
  }

  function loadRazorpayScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.head.appendChild(script);
    });
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.7)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "#0e0e1f",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: "24px 24px 0 0",
          padding: "32px 24px 48px",
          width: "100%",
          maxWidth: "430px",
          animation: "slideUp 300ms ease-out",
        }}
      >
        {/* Handle */}
        <div
          style={{
            width: "36px",
            height: "4px",
            background: "rgba(255,255,255,0.15)",
            borderRadius: "2px",
            margin: "0 auto 28px",
          }}
        />

        {/* Stars */}
        <p style={{ textAlign: "center", fontSize: "28px", marginBottom: "16px" }}>✦</p>

        <h2
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontSize: "26px",
            fontWeight: 400,
            color: "#fff",
            textAlign: "center",
            marginBottom: "12px",
          }}
        >
          Your free questions are up
        </h2>

        <p
          style={{
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            fontWeight: 300,
            color: "rgba(255,255,255,0.5)",
            textAlign: "center",
            lineHeight: 1.6,
            marginBottom: "28px",
          }}
        >
          You've used all 3 free questions.
          <br />
          Unlock unlimited questions for today.
        </p>

        {/* Price card */}
        <div
          style={{
            background: "rgba(139,92,246,0.08)",
            border: "1px solid rgba(139,92,246,0.2)",
            borderRadius: "16px",
            padding: "20px",
            textAlign: "center",
            marginBottom: "24px",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              color: "rgba(255,255,255,0.4)",
              marginBottom: "6px",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            24-hour unlimited pass
          </p>
          <p
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontSize: "40px",
              color: "#fff",
              marginBottom: "4px",
            }}
          >
            ₹50
          </p>
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "12px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            Unlimited questions · Valid for 24 hours
          </p>
        </div>

        {/* Features */}
        <div style={{ marginBottom: "24px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {[
            "Unlimited questions today",
            "Confidence scores + timing windows",
            "Do / Avoid / Wait action plans",
          ].map((f) => (
            <div
              key={f}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "13px",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <span style={{ color: "#a78bfa" }}>✦</span>
              {f}
            </div>
          ))}
        </div>

        {error && (
          <p
            style={{
              fontFamily: "var(--font-inter), sans-serif",
              fontSize: "13px",
              color: "#f87171",
              textAlign: "center",
              marginBottom: "12px",
            }}
          >
            {error}
          </p>
        )}

        <button
          onClick={handleUnlock}
          disabled={loading}
          style={{
            width: "100%",
            padding: "16px",
            background: loading
              ? "rgba(139,92,246,0.15)"
              : "rgba(139,92,246,0.85)",
            border: "1px solid rgba(139,92,246,0.4)",
            borderRadius: "14px",
            color: "#fff",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "16px",
            fontWeight: 400,
            cursor: loading ? "default" : "pointer",
            transition: "all 200ms ease",
          }}
        >
          {loading ? "Processing…" : "Unlock for ₹50"}
        </button>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "14px",
            marginTop: "10px",
            background: "transparent",
            border: "none",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
