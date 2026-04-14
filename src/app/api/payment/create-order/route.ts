import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getRazorpay, PASS_AMOUNT_PAISE } from "@/lib/razorpay";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const razorpay = getRazorpay();

    const order = await razorpay.orders.create({
      amount: PASS_AMOUNT_PAISE,
      currency: "INR",
      receipt: `pass_${userId}_${Date.now()}`,
      notes: { userId, passType: "daily" },
    });

    // Record in Firestore
    const db = getDb();
    await db
      .collection(COLLECTIONS.PAYMENTS)
      .doc(order.id)
      .set({
        userId,
        orderId: order.id,
        paymentId: null,
        signature: null,
        amount: PASS_AMOUNT_PAISE,
        currency: "INR",
        status: "created",
        passType: "daily",
        createdAt: FieldValue.serverTimestamp(),
        paidAt: null,
      });

    // Fire-and-forget log
    fetch(`${process.env.NEXTAUTH_URL}/api/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "payment_initiated",
        userId,
        email: session.user.email ?? "",
        meta: { amount: 50 },
      }),
    }).catch(() => {});

    return NextResponse.json({
      orderId: order.id,
      amount: PASS_AMOUNT_PAISE,
      currency: "INR",
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
