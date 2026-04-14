import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export const FREE_QUESTION_LIMIT = 3;
export const PASS_PRICE_PAISE = 5000; // ₹50

export type QuotaStatus =
  | { allowed: true; wasPaid: boolean; freeQuestionsUsed: number }
  | { allowed: false; reason: "PAYWALL"; freeQuestionsUsed: number };

export async function checkQuota(userId: string): Promise<QuotaStatus> {
  const db = getDb();
  const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
  const snap = await userRef.get();

  if (!snap.exists) {
    return { allowed: false, reason: "PAYWALL", freeQuestionsUsed: 0 };
  }

  const data = snap.data()!;
  const freeQuestionsUsed: number = data.freeQuestionsUsed ?? 0;
  const paymentStatus: string = data.paymentStatus ?? "free";
  const passExpiresAt: Timestamp | null = data.passExpiresAt ?? null;

  // Active paid pass
  if (
    paymentStatus === "active" &&
    passExpiresAt &&
    passExpiresAt.toMillis() > Date.now()
  ) {
    return { allowed: true, wasPaid: true, freeQuestionsUsed };
  }

  // Free questions remaining
  if (freeQuestionsUsed < FREE_QUESTION_LIMIT) {
    return { allowed: true, wasPaid: false, freeQuestionsUsed };
  }

  return { allowed: false, reason: "PAYWALL", freeQuestionsUsed };
}

export async function incrementFreeQuestions(userId: string): Promise<void> {
  const db = getDb();
  await db
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .update({
      freeQuestionsUsed: FieldValue.increment(1),
      totalQuestions: FieldValue.increment(1),
    });
}

export async function incrementPaidQuestions(userId: string): Promise<void> {
  const db = getDb();
  await db
    .collection(COLLECTIONS.USERS)
    .doc(userId)
    .update({
      totalQuestions: FieldValue.increment(1),
    });
}

export async function getUserQuotaInfo(userId: string): Promise<{
  freeQuestionsUsed: number;
  paymentStatus: string;
  passExpiresAt: string | null;
}> {
  const db = getDb();
  const snap = await db.collection(COLLECTIONS.USERS).doc(userId).get();

  if (!snap.exists) {
    return { freeQuestionsUsed: 0, paymentStatus: "free", passExpiresAt: null };
  }

  const data = snap.data()!;
  const passExpiresAt: Timestamp | null = data.passExpiresAt ?? null;

  return {
    freeQuestionsUsed: data.freeQuestionsUsed ?? 0,
    paymentStatus: data.paymentStatus ?? "free",
    passExpiresAt: passExpiresAt ? passExpiresAt.toDate().toISOString() : null,
  };
}
