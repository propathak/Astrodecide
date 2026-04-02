import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ALIA_SYSTEM_PROMPT, buildChartContext, buildTransitContext } from "@/lib/alia";
import { getCurrentTransits, parseBirthDataString } from "@/lib/astrology";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, category } = body as {
      messages: { role: "user" | "assistant"; content: string }[];
      category?: string;
    };

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    // Load profile from cookie
    const profileCookie = req.cookies.get("astro_profile")?.value;
    let profileData: Record<string, string> | null = null;
    let chartContext = "";
    let transitContext = "";

    if (profileCookie) {
      try {
        profileData = JSON.parse(profileCookie);
      } catch {
        // ignore
      }
    }

    if (profileData?.dob && profileData?.tob && profileData?.lat && profileData?.lon) {
      const birthData = parseBirthDataString(
        profileData.dob,
        profileData.tob,
        parseFloat(profileData.lat),
        parseFloat(profileData.lon),
        parseFloat(profileData.tzone ?? "5.5")
      );

      chartContext = profileData.chart_data
        ? buildChartContext(JSON.parse(profileData.chart_data))
        : "";

      try {
        const transits = await getCurrentTransits(birthData);
        transitContext = buildTransitContext(transits);
      } catch {
        // transits are optional
      }
    }

    // Build system prompt with chart context
    const systemPrompt = [
      ALIA_SYSTEM_PROMPT,
      profileData?.name ? `\nUser's name: ${profileData.name}` : "",
      chartContext,
      transitContext,
      profileData?.dasha_data
        ? `\nCURRENT DASHA:\n${profileData.dasha_data}`
        : "",
      category ? `\nThis question relates to: ${category}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    // Stream response from Claude
    const stream = await client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Return SSE stream
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const data = JSON.stringify({ delta: { text: event.delta.text } });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}
