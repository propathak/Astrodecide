import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseBirthDataString, getCurrentTransits } from "@/lib/astrology";
import { ALIA_SYSTEM_PROMPT } from "@/lib/alia";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = ["Career", "Love", "Self", "Energy"];

export interface DailyInsight {
  id:       string;
  text:     string;
  planet:   string;
  house:    number;
  category: string;
}

export async function GET(req: NextRequest) {
  try {
    const todayStr = new Date().toISOString().split("T")[0]; // "2026-05-28"

    // ── Try Firestore-backed cache for authenticated users ────────────────────
    const session = await auth();
    if (session?.user?.id) {
      const db     = getDb();
      const userId = session.user.id;

      // Parallel: cache + user + chart reads
      const [cacheSnap, userSnap, chartSnap] = await Promise.all([
        db.collection(COLLECTIONS.DAILY_CACHE).doc(userId).get(),
        db.collection(COLLECTIONS.USERS).doc(userId).get(),
        db.collection(COLLECTIONS.CHARTS).doc(userId).get(),
      ]);

      // ── Cache hit ──────────────────────────────────────────────────────────
      if (cacheSnap.exists && cacheSnap.data()!.date === todayStr) {
        return NextResponse.json({ insights: cacheSnap.data()!.insights as DailyInsight[] });
      }

      // ── Build profile from Firestore docs ──────────────────────────────────
      if (userSnap.exists && chartSnap.exists) {
        const user  = userSnap.data()!;
        const chart = chartSnap.data()!;

        if (user.dob && user.tob) {
          const insights = await generateInsights({
            name:         user.name ?? "You",
            dob:          user.dob,
            tob:          user.tob,
            lat:          user.lat  ?? 0,
            lon:          user.lon  ?? 0,
            tzone:        user.tzone ?? 5.5,
            chart_data:   chart.chartData    ?? "",
            dasha_data:   chart.dashaData    ?? "",
            chart_context: chart.chartContext ?? "",
          }, todayStr);

          if (insights.length > 0) {
            // Persist to cache (fire-and-forget)
            db.collection(COLLECTIONS.DAILY_CACHE).doc(userId).set({
              date:     todayStr,
              insights,
              cachedAt: FieldValue.serverTimestamp(),
            }).catch(console.error);
          }

          return NextResponse.json({ insights });
        }
      }
    }

    // ── Fallback: cookie-based (unauthenticated or Firestore miss) ────────────
    const profileCookie = req.cookies.get("astro_profile")?.value;
    if (!profileCookie) return NextResponse.json({ insights: [] });

    let profileData: Record<string, string | number>;
    try { profileData = JSON.parse(profileCookie); } catch { return NextResponse.json({ insights: [] }); }

    if (!profileData?.dob || !profileData?.tob) return NextResponse.json({ insights: [] });

    const insights = await generateInsights({
      name:         String(profileData.name ?? "You"),
      dob:          String(profileData.dob),
      tob:          String(profileData.tob),
      lat:          Number(profileData.lat  ?? 0),
      lon:          Number(profileData.lon  ?? 0),
      tzone:        Number(profileData.tzone ?? 5.5),
      chart_data:   String(profileData.chart_data   ?? ""),
      dasha_data:   String(profileData.dasha_data   ?? ""),
      chart_context: String(profileData.chart_context ?? ""),
    }, todayStr);

    return NextResponse.json({ insights });

  } catch (err) {
    console.error("Daily API error:", err);
    return NextResponse.json({ insights: [] });
  }
}

// ── Shared generation logic ───────────────────────────────────────────────────
async function generateInsights(profile: {
  name: string; dob: string; tob: string;
  lat: number; lon: number; tzone: number;
  chart_data: string; dasha_data: string; chart_context: string;
}, todayStr: string): Promise<DailyInsight[]> {
  try {
    const birthData = parseBirthDataString(
      profile.dob, profile.tob,
      profile.lat, profile.lon, profile.tzone,
    );

    let transitData = null;
    try { transitData = await getCurrentTransits(birthData); } catch { /* continue */ }

    const chartContext  = profile.chart_context || (profile.chart_data ? `BIRTH CHART:\n${profile.chart_data}` : "");
    const transitContext = transitData ? `CURRENT TRANSITS:\n${JSON.stringify(transitData)}` : "";

    const systemPrompt = [
      ALIA_SYSTEM_PROMPT,
      chartContext,
      transitContext,
      profile.dasha_data ? `CURRENT DASHA:\n${profile.dasha_data}` : "",
    ].filter(Boolean).join("\n\n");

    const today  = new Date(todayStr).toDateString();
    const prompt = `Give ${profile.name || "this person"} exactly ${CATEGORIES.length} daily insights for ${today}. One per category: ${CATEGORIES.join(", ")}.

Rules: 1 sentence each. Second person. Name the specific planet/house. No filler.

Return JSON only:
[{"category":"Career","text":"...","planet":"Saturn","house":10},...]`;

    const response = await client.messages.create({
      model:      "claude-haiku-4-5",
      max_tokens: 400,
      system:     systemPrompt,
      messages:   [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return [];

    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.map((item: Record<string, unknown>, i: number) => ({
      id:       `${todayStr}-${i}`,
      text:     item.text,
      planet:   item.planet,
      house:    item.house,
      category: item.category,
    }));
  } catch {
    return [];
  }
}
