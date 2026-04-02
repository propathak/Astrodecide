import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { parseBirthDataString, getCurrentTransits } from "@/lib/astrology";
import { ALIA_SYSTEM_PROMPT } from "@/lib/alia";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CATEGORIES = ["Career", "Love", "Self", "Energy"];

export async function GET(req: NextRequest) {
  try {
    const profileCookie = req.cookies.get("astro_profile")?.value;

    if (!profileCookie) {
      return NextResponse.json({ insights: [] });
    }

    let profileData: Record<string, string>;
    try {
      profileData = JSON.parse(profileCookie);
    } catch {
      return NextResponse.json({ insights: [] });
    }

    if (!profileData?.dob || !profileData?.tob) {
      return NextResponse.json({ insights: [] });
    }

    const birthData = parseBirthDataString(
      profileData.dob,
      profileData.tob,
      parseFloat(profileData.lat ?? "0"),
      parseFloat(profileData.lon ?? "0"),
      parseFloat(profileData.tzone ?? "5.5")
    );

    let transitData = null;
    try {
      transitData = await getCurrentTransits(birthData);
    } catch {
      // continue without transits
    }

    const chartContext = profileData.chart_data
      ? `BIRTH CHART:\n${profileData.chart_data}`
      : "";
    const transitContext = transitData
      ? `CURRENT TRANSITS:\n${JSON.stringify(transitData)}`
      : "";

    const today = new Date().toDateString();
    const systemPrompt = [
      ALIA_SYSTEM_PROMPT,
      chartContext,
      transitContext,
      profileData.dasha_data ? `CURRENT DASHA:\n${profileData.dasha_data}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const prompt = `Generate exactly ${CATEGORIES.length} daily insight statements for ${profileData.name || "this person"} for ${today}.

Each insight should be:
- 1-3 sentences maximum
- Written in second person ("You...")
- Specific to their chart placements and current transits
- One per category: ${CATEGORIES.join(", ")}
- Include which planet/house this relates to

Return as JSON array:
[
  {"category": "Career", "text": "...", "planet": "Saturn", "house": 10},
  {"category": "Love", "text": "...", "planet": "Venus", "house": 7},
  ...
]`;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ insights: [] });
    }

    let insights = [];
    try {
      const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        insights = parsed.map((item: Record<string, unknown>, i: number) => ({
          id: `${today}-${i}`,
          text: item.text,
          planet: item.planet,
          house: item.house,
          category: item.category,
        }));
      }
    } catch {
      // Return raw text as single insight fallback
      insights = [
        {
          id: `${today}-0`,
          text: textBlock.text,
          planet: "Sun",
          house: 1,
          category: "Today",
        },
      ];
    }

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("Daily API error:", err);
    return NextResponse.json({ insights: [] });
  }
}
