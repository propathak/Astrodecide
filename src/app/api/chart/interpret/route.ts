import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ALIA_SYSTEM_PROMPT } from "@/lib/alia";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { planet } = await req.json();

    const profileCookie = req.cookies.get("astro_profile")?.value;
    let chartContext = "";
    let name = "this person";

    if (profileCookie) {
      try {
        const p = JSON.parse(profileCookie);
        name = p.name || name;
        if (p.chart_data) {
          const planets = JSON.parse(p.chart_data);
          const found = planets.find(
            (pl: Record<string, unknown>) => pl.name === planet
          );
          if (found) {
            chartContext = `${planet} is in ${found.sign}, House ${found.house}, Nakshatra: ${found.nakshatra || "unknown"}, Degree: ${found.full_degree?.toFixed(2) || "unknown"}°`;
          }
        }
      } catch {
        // ignore
      }
    }

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 300,
      system: ALIA_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Give me a 3-4 sentence interpretation of ${planet} in ${name}'s chart. ${chartContext}. Be specific to their placement. No preamble.`,
        },
      ],
    });

    const text = response.content.find((b) => b.type === "text");
    return NextResponse.json({
      interpretation: text?.type === "text" ? text.text : "Unable to interpret this placement.",
    });
  } catch (err) {
    console.error("Interpret error:", err);
    return NextResponse.json({ interpretation: "Unable to load interpretation." });
  }
}
