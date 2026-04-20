import Razorpay from "razorpay";
import crypto from "crypto";

let _client: Razorpay | null = null;

export function getRazorpay(): Razorpay {
  if (!_client) {
    _client = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _client;
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expected === signature;
}

export type PassPlan = "daily" | "weekly" | "monthly" | "yearly";

export const PLANS: Record<PassPlan, { amountPaise: number; durationMs: number; label: string; priceDisplay: string; originalDisplay: string; savingLabel: string }> = {
  daily:   { amountPaise:  4900, durationMs:      24 * 60 * 60 * 1000, label: "24-Hour Pass",  priceDisplay: "₹49",   originalDisplay: "₹99",   savingLabel: "50% off" },
  weekly:  { amountPaise: 29900, durationMs:   7 * 24 * 60 * 60 * 1000, label: "7-Day Pass",    priceDisplay: "₹299",  originalDisplay: "₹599",  savingLabel: "50% off" },
  monthly: { amountPaise: 49900, durationMs:  30 * 24 * 60 * 60 * 1000, label: "30-Day Pass",   priceDisplay: "₹499",  originalDisplay: "₹999",  savingLabel: "50% off" },
  yearly:  { amountPaise: 199900, durationMs: 365 * 24 * 60 * 60 * 1000, label: "1-Year Pass",   priceDisplay: "₹1,999",originalDisplay: "₹3,999",savingLabel: "50% off" },
};

// Legacy compat
export const PASS_AMOUNT_PAISE = PLANS.daily.amountPaise;
export const PASS_DURATION_MS  = PLANS.daily.durationMs;
