import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserQuotaInfo } from "@/lib/quota";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const info = await getUserQuotaInfo(session.user.id);
    return NextResponse.json(info);
  } catch (err) {
    console.error("Quota fetch error:", err);
    return NextResponse.json({ error: "Failed to fetch quota" }, { status: 500 });
  }
}
