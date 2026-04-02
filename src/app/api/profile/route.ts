import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ALIA_SYSTEM_PROMPT } from "@/lib/alia";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function GET(req: NextRequest) {
  try {
    const profileCookie = req.cookies.get("astro_profile")?.value;

    if (!profileCookie) {
      return NextResponse.json({ profile: null });
    }

    let profileData: Record<string, string>;
    try {
      profileData = JSON.parse(profileCookie);
    } catch {
      return NextResponse.json({ profile: null });
    }

    if (!profileData.name) {
      return NextResponse.json({ profile: null });
    }

    // Parse dasha data
    let dashaLabel = "Calculating...";
    let dashaEnd = "";

    if (profileData.dasha_data) {
      try {
        const dasha = JSON.parse(profileData.dasha_data);
        if (Array.isArray(dasha) && dasha.length > 0) {
          const current = dasha[0];
          dashaLabel = `${current.planet || current.dasha} Mahadasha`;
          dashaEnd = current.end_date || current.end || "";
        } else if (dasha.mahadasha_lord) {
          dashaLabel = `${dasha.mahadasha_lord} Mahadasha`;
          dashaEnd = dasha.mahadasha_end || "";
        }
      } catch {
        // ignore
      }
    }

    // Generate profile insights via Claude if not cached
    let insights = {
      career: "Planetary energies are aligning for significant professional growth.",
      relationships: "Venus transits suggest meaningful connections on the horizon.",
      self: "Your Ascendant calls you toward deeper self-understanding this season.",
    };

    if (profileData.chart_data) {
      try {
        const prompt = `For ${profileData.name} with this birth chart data: ${profileData.chart_data}

Generate 3 brief profile insights (1-2 sentences each) for:
1. Career
2. Relationships
3. Self/Inner life

Return as JSON: {"career": "...", "relationships": "...", "self": "..."}`;

        const response = await client.messages.create({
          model: "claude-opus-4-6",
          max_tokens: 512,
          system: ALIA_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        });

        const text = response.content.find((b) => b.type === "text");
        if (text?.type === "text") {
          const jsonMatch = text.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            insights = JSON.parse(jsonMatch[0]);
          }
        }
      } catch {
        // use defaults
      }
    }

    return NextResponse.json({
      profile: {
        name: profileData.name,
        rising: profileData.ascendant_sign || "—",
        moon: profileData.moon_sign || "—",
        sun: profileData.sun_sign || "—",
        dasha: dashaLabel,
        dashaEnd,
        insights,
      },
    });
  } catch (err) {
    console.error("Profile API error:", err);
    return NextResponse.json({ profile: null });
  }
}
