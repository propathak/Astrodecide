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

    const prompt = `Give ${profileData.name || "this person"} exactly ${CATEGORIES.length} daily insights for ${today}. One per category: ${CATEGORIES.join(", ")}.

Rules: 1 sentence each. Second person. Name the specific planet/house. No filler.

Return JSON only:
[{"category":"Career","text":"...","planet":"Saturn","house":10},...]`;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 400,
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
      // JSON parse failed — return empty so UI falls back to default greeting
      insights = [];
    }

    return NextResponse.json({ insights });
  } catch (err) {
    console.error("Daily API error:", err);
    return NextResponse.json({ insights: [] });
  }
}
