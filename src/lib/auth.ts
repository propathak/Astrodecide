import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user }) {
      if (!user.email) return false;

      try {
        const db = getDb();
        const userId = user.id!;
        const userRef = db.collection(COLLECTIONS.USERS).doc(userId);
        const userSnap = await userRef.get();

        if (!userSnap.exists) {
          // New user — create document
          await userRef.set({
            name: user.name ?? "",
            email: user.email,
            image: user.image ?? "",
            onboardingDone: false,
            createdAt: FieldValue.serverTimestamp(),
            lastLoginAt: FieldValue.serverTimestamp(),
            paymentStatus: "free",
            passExpiresAt: null,
            freeQuestionsUsed: 0,
            totalQuestions: 0,
          });
        } else {
          // Existing user — update last login
          await userRef.update({
            lastLoginAt: FieldValue.serverTimestamp(),
            name: user.name ?? userSnap.data()?.name,
            image: user.image ?? userSnap.data()?.image,
          });
        }

        // Fire-and-forget: log login to Sheets
        fetch(`${process.env.NEXTAUTH_URL}/api/log`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "login",
            userId,
            email: user.email,
            meta: {},
          }),
        }).catch(() => {});
      } catch (err) {
        console.error("signIn Firestore error:", err);
        // Don't block login on Firestore errors
      }

      return true;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
