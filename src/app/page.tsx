import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const cookieStore = await cookies();
  const hasProfile = cookieStore.has("astro_profile");

  if (hasProfile) {
    redirect("/ask");
  } else {
    redirect("/onboarding");
  }
}
