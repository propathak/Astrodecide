import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { Timestamp } from "firebase-admin/firestore";

// Sonnet at 1200 tokens ≈ 12–15s; 60s gives comfortable headroom
export const maxDuration = 60;

const DASHA_SYSTEM_PROMPT = "You are a Vedic astrology expert specialising in Vimshottari Dasha interpretation. Respond ONLY with valid JSON — no markdown fences, no commentary before or after the JSON object.";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function isPaidUser(data: Record<string, unknown>): boolean {
  const status = data.paymentStatus as string ?? "free";
  const exp    = data.passExpiresAt as Timestamp | null ?? null;
  return status === "active" && !!exp && exp.toMillis() > Date.now();
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db     = getDb();
    const userId = session.user.id;

    const [userSnap, chartSnap] = await Promise.all([
      db.collection(COLLECTIONS.USERS).doc(userId).get(),
      db.collection(COLLECTIONS.CHARTS).doc(userId).get(),
    ]);

    if (!userSnap.exists || !chartSnap.exists) {
      return NextResponse.json({ error: "No chart found" }, { status: 404 });
    }

    const user  = userSnap.data()!;
    const chart = chartSnap.data()!;
    const paid  = isPaidUser(user);

    // ── Parse dasha data ──────────────────────────────────────────────────────
    let mahadasha  = "Unknown";
    let antardasha = "Unknown";
    let mahaEnd    = "";
    let antarEnd   = "";

    if (chart.dashaData) {
      try {
        const d   = JSON.parse(chart.dashaData as string);
        mahadasha  = d.mahadasha_lord  ?? "Unknown";
        mahaEnd    = d.mahadasha_end   ?? "";
        antardasha = d.antardasha_lord ?? "Unknown";
        antarEnd   = d.antardasha_end  ?? "";
      } catch { /* ignore */ }
    }

    const chartContext = chart.chartContext as string ?? "";
    const name         = user.name       as string ?? "You";

    // ── Firestore cache — top-level collection, same pattern as dashboard ────
    // Key: userId (one doc per user; antardasha period lasts months so this is stable)
    const cacheSnap = await db.collection(COLLECTIONS.DASHA_CACHE).doc(userId).get();

    if (cacheSnap.exists) {
      const cached = cacheSnap.data()!;
      // Invalidate if the dasha period has changed (mahadasha or antardasha lord differs)
      if (cached.mahadasha === mahadasha && cached.antardasha === antardasha) {
        return NextResponse.json({
          name, mahadasha, antardasha, mahaEnd, antarEnd, isPaid: paid,
          analysis: cached.analysis,
          fromCache: true,
        });
      }
    }

    // ── Compact prompt targeting ~700 output tokens ───────────────────────────
    const prompt = `Personal dasha analysis for ${name}.

BIRTH CHART:
${chartContext || "Chart not available — use dasha lords to guide analysis."}

DASHA PERIOD:
Mahadasha: ${mahadasha} (ends ${mahaEnd || "unknown"})
Antardasha: ${antardasha} (ends ${antarEnd || "unknown"})

Respond ONLY with this JSON (no markdown, no commentary — start your reply with { and end with }):
{
  "emotionalSummary": "One sentence. What this dasha is actively doing to the person right now.",
  "impacts": [
    { "area": "Career",        "icon": "▲", "title": "3-word title", "body": "One sentence." },
    { "area": "Relationships", "icon": "♡", "title": "3-word title", "body": "One sentence." },
    { "area": "Mindset",       "icon": "◎", "title": "3-word title", "body": "One sentence." },
    { "area": "Finances",      "icon": "◈", "title": "3-word title", "body": "One sentence." },
    { "area": "Health",        "icon": "◉", "title": "3-word title", "body": "One sentence." }
  ],
  "challenges": [
    { "name": "2-word name", "why": "One sentence.", "trigger": "One sentence.", "feels": "One sentence." },
    { "name": "2-word name", "why": "One sentence.", "trigger": "One sentence.", "feels": "One sentence." },
    { "name": "2-word name", "why": "One sentence.", "trigger": "One sentence.", "feels": "One sentence." }
  ],
  "timeline": [
    { "phase": "Current Phase",      "label": "1-2 words", "period": "Now – date", "description": "One sentence." },
    { "phase": "Transition Phase",   "label": "1-2 words", "period": "date range", "description": "One sentence." },
    { "phase": "Breakthrough Phase", "label": "1-2 words", "period": "date range", "description": "One sentence." }
  ],
  "lessons": [],
  "remedies": []
}`;

    const response = await client.messages.create({
      model:      "claude-sonnet-4-5",
      max_tokens: 1200,  // 5 impacts + 3 challenges + 3 timeline ≈ 700–900 tokens; 1200 gives safe headroom
      system:     DASHA_SYSTEM_PROMPT,
      messages:   [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No AI response" }, { status: 500 });
    }

    const rawText = textBlock.text;
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error("[dasha] non-JSON response:", rawText.slice(0, 300));
      return NextResponse.json({ error: "Invalid AI response format" }, { status: 500 });
    }

    let analysis: Record<string, unknown>;
    try {
      analysis = JSON.parse(match[0]);
    } catch (parseErr) {
      console.error("[dasha] JSON parse failed:", parseErr, "\nraw[:400]:", rawText.slice(0, 400));
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    // Ensure lessons/remedies always exist as arrays (page expects them)
    if (!analysis.lessons)  analysis.lessons  = [];
    if (!analysis.remedies) analysis.remedies = [];

    // Fire-and-forget cache write — top-level collection, same as dashboard
    db.collection(COLLECTIONS.DASHA_CACHE).doc(userId)
      .set({ analysis, mahadasha, antardasha, cachedAt: new Date().toISOString() })
      .catch((e) => console.error("[dasha] cache write failed:", e));

    return NextResponse.json({
      name, mahadasha, antardasha, mahaEnd, antarEnd, isPaid: paid, analysis,
    });

  } catch (err) {
    console.error("[dasha] error:", err);
    return NextResponse.json({ error: "Failed to generate analysis" }, { status: 500 });
  }
}
