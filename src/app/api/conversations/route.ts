import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { Timestamp } from "firebase-admin/firestore";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Only serve history to paid users with an active pass
    const db = getDb();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(userId).get();
    if (!userSnap.exists) return NextResponse.json({ messages: [] });

    const userData = userSnap.data()!;
    const passExpiresAt: Timestamp | null = userData.passExpiresAt ?? null;
    const isPaid =
      userData.paymentStatus === "active" &&
      passExpiresAt &&
      passExpiresAt.toMillis() > Date.now();

    if (!isPaid) return NextResponse.json({ messages: [] });

    // Fetch questions from the last 24 hours
    const since = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000);
    const snap = await db
      .collection(COLLECTIONS.QUESTIONS)
      .where("userId", "==", userId)
      .where("createdAt", ">=", since)
      .orderBy("createdAt", "asc")
      .limit(20)
      .get();

    const messages: { role: "user" | "assistant"; content: string; createdAt: string }[] = [];

    snap.docs.forEach((doc) => {
      const d = doc.data();
      messages.push({
        role: "user",
        content: d.question,
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
      });
      messages.push({
        role: "assistant",
        content: d.answer,
        createdAt: (d.createdAt as Timestamp).toDate().toISOString(),
      });
    });

    return NextResponse.json({ messages });
  } catch (err) {
    console.error("Conversations fetch error:", err);
    return NextResponse.json({ messages: [] });
  }
}
