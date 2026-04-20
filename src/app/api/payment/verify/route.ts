import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyPaymentSignature, PLANS } from "@/lib/razorpay";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { appendToSheet } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { orderId, paymentId, signature } = body as {
      orderId: string;
      paymentId: string;
      signature: string;
    };

    if (!orderId || !paymentId || !signature) {
      return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
    }

    // Verify HMAC signature
    const valid = verifyPaymentSignature(orderId, paymentId, signature);
    if (!valid) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const db = getDb();

    // Read durationMs from the payment record (set at order creation)
    const paymentDoc = await db.collection(COLLECTIONS.PAYMENTS).doc(orderId).get();
    const paymentData = paymentDoc.data() ?? {};
    const passType = (paymentData.passType as string) ?? "daily";
    const durationMs: number = paymentData.durationMs ?? PLANS[passType as keyof typeof PLANS]?.durationMs ?? PLANS.daily.durationMs;
    const amountPaid: number = paymentData.amount ?? 0;

    const passExpiresAt = Timestamp.fromMillis(Date.now() + durationMs);

    // Update payment record
    await db.collection(COLLECTIONS.PAYMENTS).doc(orderId).update({
      paymentId,
      signature,
      status: "paid",
      paidAt: FieldValue.serverTimestamp(),
    });

    // Unlock user pass
    await db.collection(COLLECTIONS.USERS).doc(userId).update({
      paymentStatus: "active",
      passType,
      passExpiresAt,
    });

    await appendToSheet({
      event: "payment_success",
      userId,
      email: session.user.email ?? "",
      meta: { amount: amountPaid / 100 },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      passExpiresAt: passExpiresAt.toDate().toISOString(),
    });
  } catch (err) {
    console.error("Verify payment error:", err);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
