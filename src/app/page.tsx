import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";

export default async function RootPage() {
  const session = await auth();

  // Not logged in — go to sign in
  if (!session?.user?.id) {
    redirect("/auth/signin");
  }

  // Check Firestore for onboarding status
  try {
    const db = getDb();
    const userSnap = await db.collection(COLLECTIONS.USERS).doc(session.user.id).get();

    if (userSnap.exists && userSnap.data()?.onboardingDone) {
      redirect("/ask");
    } else {
      redirect("/onboarding");
    }
  } catch {
    // Firestore unavailable — fallback to cookie check
    const cookieStore = await cookies();
    const hasProfile = cookieStore.has("astro_profile");
    redirect(hasProfile ? "/ask" : "/onboarding");
  }
}
