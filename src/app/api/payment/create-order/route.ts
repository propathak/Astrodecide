import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRazorpay, PLANS, PassPlan } from "@/lib/razorpay";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { appendToSheet } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const plan: PassPlan = (body.plan && PLANS[body.plan as PassPlan]) ? (body.plan as PassPlan) : "daily";
    const planConfig = PLANS[plan];

    const userId = session.user.id;
    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: planConfig.amountPaise,
      currency: "INR",
      receipt: `pass_${userId}_${Date.now()}`,
      notes: { userId, passType: plan, durationMs: String(planConfig.durationMs) },
    });

    // Record in Firestore (store durationMs so verify route can use it)
    const db = getDb();
    await db
      .collection(COLLECTIONS.PAYMENTS)
      .doc(order.id)
      .set({
        userId,
        orderId: order.id,
        paymentId: null,
        signature: null,
        amount: planConfig.amountPaise,
        currency: "INR",
        status: "created",
        passType: plan,
        durationMs: planConfig.durationMs,
        createdAt: FieldValue.serverTimestamp(),
        paidAt: null,
      });

    appendToSheet({
      event: "payment_initiated",
      userId,
      email: session.user.email ?? "",
      meta: { amount: planConfig.amountPaise / 100 },
    }).catch(() => {});

    return NextResponse.json({
      orderId: order.id,
      amount: planConfig.amountPaise,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
