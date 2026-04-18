import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ALIA_SYSTEM_PROMPT } from "@/lib/alia";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  try {
    // ── Load profile: Firestore first, cookie fallback ────────────────────
    let profileData: Record<string, string> | null = null;

    const session = await auth();
    if (session?.user?.id) {
      try {
        const db = getDb();
        const [userSnap, chartSnap] = await Promise.all([
          db.collection(COLLECTIONS.USERS).doc(session.user.id).get(),
          db.collection(COLLECTIONS.CHARTS).doc(session.user.id).get(),
        ]);
        if (userSnap.exists && chartSnap.exists) {
          const user  = userSnap.data()!;
          const chart = chartSnap.data()!;
          profileData = {
            name:           user.name            ?? "",
            ascendant_sign: chart.ascendantSign  ?? "",
            sun_sign:       chart.sunSign        ?? "",
            moon_sign:      chart.moonSign       ?? "",
            chart_data:     chart.chartData      ?? "",
            dasha_data:     chart.dashaData      ?? "",
            chart_context:  chart.chartContext   ?? "",
          };
        }
      } catch { /* fall through to cookie */ }
    }

    if (!profileData) {
      const cookie = req.cookies.get("astro_profile")?.value;
      if (!cookie) return NextResponse.json({ profile: null });
      try { profileData = JSON.parse(cookie); } catch {
        return NextResponse.json({ profile: null });
      }
    }

    if (!profileData?.name) return NextResponse.json({ profile: null });

    // ── Parse signs ───────────────────────────────────────────────────────
    const sunSign    = profileData.sun_sign       || "—";
    const moonSign   = profileData.moon_sign      || "—";
    const risingSign = profileData.ascendant_sign || "—";

    // ── Parse dasha ───────────────────────────────────────────────────────
    let dashaLabel = "Calculating…";
    let dashaEnd   = "";
    let dashaDescription = "A transformative period of growth and self-discovery.";

    if (profileData.dasha_data) {
      try {
        const d = JSON.parse(profileData.dasha_data);
        if (d.mahadasha_lord) {
          dashaLabel = `${d.mahadasha_lord} Mahadasha`;
          dashaEnd   = d.mahadasha_end ?? "";
          if (d.antardasha_lord) {
            dashaLabel += ` / ${d.antardasha_lord} Antardasha`;
          }
        }
      } catch { /* ignore */ }
    }

    // ── Build chart context for Claude ────────────────────────────────────
    // Use pre-built chartContext if available, else fall back to chart_data JSON
    let chartContext = profileData.chart_context ?? "";
    if (!chartContext && profileData.chart_data) {
      try {
        const cd = JSON.parse(profileData.chart_data);
        chartContext = cd.chartContext ?? JSON.stringify(cd);
      } catch {
        chartContext = profileData.chart_data;
      }
    }

    // ── Defaults ──────────────────────────────────────────────────────────
    let insights: { career: string; relationships: string; self: string } = {
      career:        "Planetary energies are aligning for significant professional growth.",
      relationships: "Venus transits suggest meaningful connections on the horizon.",
      self:          "Your Ascendant calls you toward deeper self-understanding this season.",
    };
    let traits:  string[] = ["Intuitive", "Ambitious", "Empathic", "Creative", "Adaptable", "Perceptive"];
    let summary: string   = "A soul of rare depth, guided by ancient cosmic patterns.";

    // ── Ask Claude for personalized insights ─────────────────────────────
    if (chartContext) {
      try {
        const prompt = `Vedic chart for ${profileData.name}. Dasha: ${dashaLabel}.

${chartContext}

Return ONLY valid JSON — no markdown, no explanation:
{
  "career": "1 sharp sentence — name the planet/house driving career",
  "relationships": "1 sharp sentence — name the relevant planet/house",
  "self": "1 sharp sentence — name the relevant placement",
  "traits": ["6 single-word or 2-word traits specific to this chart"],
  "summary": "One poetic phrase, max 10 words",
  "dasha_meaning": "1 sentence on what this Dasha means right now"
}`;

        const response = await client.messages.create({
          model:      "claude-opus-4-6",
          max_tokens: 400,
          system:     ALIA_SYSTEM_PROMPT,
          messages:   [{ role: "user", content: prompt }],
        });

        const text = response.content.find((b) => b.type === "text");
        if (text?.type === "text") {
          const match = text.text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            if (parsed.career)        insights.career        = parsed.career;
            if (parsed.relationships) insights.relationships = parsed.relationships;
            if (parsed.self)          insights.self          = parsed.self;
            if (Array.isArray(parsed.traits) && parsed.traits.length)
                                      traits                 = parsed.traits.slice(0, 6);
            if (parsed.summary)       summary                = parsed.summary;
            if (parsed.dasha_meaning) dashaDescription       = parsed.dasha_meaning;
          }
        }
      } catch { /* use defaults */ }
    }

    return NextResponse.json({
      profile: {
        name: profileData.name,
        rising: risingSign,
        moon:   moonSign,
        sun:    sunSign,
        dasha:  dashaLabel,
        dashaEnd,
        dashaDescription,
        traits,
        summary,
        insights,
      },
    });
  } catch (err) {
    console.error("Profile API error:", err);
    return NextResponse.json({ profile: null });
  }
}
