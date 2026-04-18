import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { Timestamp, FieldValue } from "firebase-admin/firestore";
import { PASS_DURATION_MS } from "@/lib/razorpay";
import { appendToSheet } from "@/lib/sheets";

// Valid coupons — add more here as needed
const VALID_COUPONS: Record<string, { label: string }> = {
  ASTRO5148: { label: "Free 24-hour pass" },
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { code } = (await req.json()) as { code?: string };
    const normalized = (code ?? "").trim().toUpperCase();

    if (!normalized || !VALID_COUPONS[normalized]) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 400 });
    }

    const db = getDb();
    const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if this user already used this coupon
    const usedCoupons: string[] = userSnap.data()?.usedCoupons ?? [];
    if (usedCoupons.includes(normalized)) {
      return NextResponse.json(
        { error: "You've already used this coupon" },
        { status: 400 }
      );
    }

    // Grant the free 24-hour pass
    const passExpiresAt = Timestamp.fromMillis(Date.now() + PASS_DURATION_MS);

    await userRef.update({
      paymentStatus: "active",
      passExpiresAt,
      usedCoupons: FieldValue.arrayUnion(normalized),
    });

    // Log to Firestore coupons collection
    await db.collection(COLLECTIONS.COUPONS).add({
      userId,
      email: session.user.email ?? "",
      code: normalized,
      redeemedAt: FieldValue.serverTimestamp(),
    });

    await appendToSheet({
      event: "payment_success",
      userId,
      email: session.user.email ?? "",
      meta: { amount: 0, question: `Coupon: ${normalized}` },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      passExpiresAt: passExpiresAt.toDate().toISOString(),
    });
  } catch (err) {
    console.error("Coupon redeem error:", err);
    return NextResponse.json({ error: "Failed to redeem coupon" }, { status: 500 });
  }
}
