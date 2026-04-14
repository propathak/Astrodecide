import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ALIA_SYSTEM_PROMPT, buildChartContext, buildTransitContext } from "@/lib/alia";
import { getCurrentTransits, parseBirthDataString } from "@/lib/astrology";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import {
  checkQuota,
  incrementFreeQuestions,
  incrementPaidQuestions,
  FREE_QUESTION_LIMIT,
} from "@/lib/quota";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STRUCTURED_OUTPUT_INSTRUCTION = `
At the END of your response, after your main answer, append exactly this JSON block on its own line — no markdown, no code fences:
---STRUCTURED---
{"confidenceScore":85,"bestTimeWindows":["Next 3 days","After Mars direct"],"do":["Action 1","Action 2"],"avoid":["Thing to avoid"],"wait":["Thing to wait on"]}
---END---

Rules for the JSON block:
- confidenceScore: 0-100. Above 70 = proceed confidently. 40-70 = proceed with caution. Below 40 = wait.
- bestTimeWindows: 1-3 specific timing suggestions (days, transits, or windows)
- do: 1-3 concrete actions to take
- avoid: 1-2 things to avoid
- wait: 0-2 things to wait on (can be empty array)
Always include this block. The user interface will parse and display it separately.`;

interface StructuredOutput {
  confidenceScore: number;
  bestTimeWindows: string[];
  do: string[];
  avoid: string[];
  wait: string[];
}

function parseStructuredOutput(text: string): {
  cleanText: string;
  structured: StructuredOutput | null;
} {
  const startTag = "---STRUCTURED---";
  const endTag = "---END---";
  const startIdx = text.indexOf(startTag);
  const endIdx = text.indexOf(endTag);

  if (startIdx === -1 || endIdx === -1) {
    return { cleanText: text, structured: null };
  }

  const jsonStr = text.slice(startIdx + startTag.length, endIdx).trim();
  const cleanText = text.slice(0, startIdx).trim();

  try {
    const parsed = JSON.parse(jsonStr) as StructuredOutput;
    return { cleanText, structured: parsed };
  } catch {
    return { cleanText, structured: null };
  }
}

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

    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    // Quota check
    const quota = await checkQuota(userId);
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: "PAYWALL",
          message: "You have used your 3 free questions. Upgrade for unlimited access.",
          freeQuestionsUsed: quota.freeQuestionsUsed,
        },
        { status: 402 }
      );
    }

    // Load profile -- prefer Firestore, fallback to cookie
    let profileData: Record<string, string> | null = null;
    let chartContext = "";
    let transitContext = "";
    let dashaContext = "";

    try {
      const db = getDb();
      const [userSnap, chartSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(userId).get(),
        db.collection(COLLECTIONS.CHARTS).doc(userId).get(),
      ]);

      if (userSnap.exists && chartSnap.exists) {
        const user = userSnap.data()!;
        const chart = chartSnap.data()!;
        profileData = {
          name: user.name,
          dob: user.dob,
          tob: user.tob,
          lat: String(user.lat),
          lon: String(user.lon),
          tzone: String(user.tzone),
          chart_data: chart.chartData,
          dasha_data: chart.dashaData,
        };
      }
    } catch {
      // Firestore unavailable -- fall back to cookie
    }

    if (!profileData) {
      const profileCookie = req.cookies.get("astro_profile")?.value;
      if (profileCookie) {
        try {
          profileData = JSON.parse(profileCookie);
        } catch {
          // ignore
        }
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

      if (profileData.dasha_data) {
        try {
          const dasha = JSON.parse(profileData.dasha_data);
          dashaContext = `Current Mahadasha: ${dasha.mahadasha_lord} (ends ${dasha.mahadasha_end})`;
        } catch {
          // ignore
        }
      }

      try {
        const transits = await getCurrentTransits(birthData);
        transitContext = buildTransitContext(transits);
      } catch {
        // transits are optional
      }
    }

    const systemPrompt = [
      ALIA_SYSTEM_PROMPT,
      profileData?.name ? `\nUser's name: ${profileData.name}` : "",
      chartContext,
      transitContext,
      dashaContext ? `\nCURRENT DASHA:\n${dashaContext}` : "",
      category ? `\nThis question relates to: ${category}` : "",
      STRUCTURED_OUTPUT_INSTRUCTION,
    ]
      .filter(Boolean)
      .join("\n\n");

    const questionText =
      [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    let fullResponse = "";

    const stream = await client.messages.stream({
      model: "claude-opus-4-6",
      max_tokens: 1500,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              fullResponse += event.delta.text;
              const data = JSON.stringify({ delta: { text: event.delta.text } });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          const { structured } = parseStructuredOutput(fullResponse);

          if (structured) {
            const structuredEvent = JSON.stringify({ structured });
            controller.enqueue(encoder.encode(`data: ${structuredEvent}\n\n`));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();

          // Post-stream: persist + quota (fire-and-forget)
          persistQuestion({
            userId,
            question: questionText,
            category: category ?? null,
            answer: fullResponse,
            structured,
            dashaContext,
            wasPaid: quota.wasPaid,
          }).catch(console.error);

          if (quota.wasPaid) {
            incrementPaidQuestions(userId).catch(console.error);
          } else {
            incrementFreeQuestions(userId).catch(console.error);
          }

          fetch(`${process.env.NEXTAUTH_URL}/api/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event: "question",
              userId,
              email: session.user.email ?? "",
              meta: { question: questionText, category: category ?? "" },
            }),
          }).catch(() => {});
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
        "X-Questions-Used": String(quota.freeQuestionsUsed + (quota.wasPaid ? 0 : 1)),
        "X-Free-Limit": String(FREE_QUESTION_LIMIT),
        "X-Was-Paid": quota.wasPaid ? "1" : "0",
      },
    });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json({ error: "Chat failed" }, { status: 500 });
  }
}

async function persistQuestion(params: {
  userId: string;
  question: string;
  category: string | null;
  answer: string;
  structured: StructuredOutput | null;
  dashaContext: string;
  wasPaid: boolean;
}) {
  const db = getDb();
  await db.collection(COLLECTIONS.QUESTIONS).add({
    userId: params.userId,
    question: params.question,
    category: params.category,
    answer: params.answer,
    confidenceScore: params.structured?.confidenceScore ?? 0,
    bestTimeWindows: params.structured?.bestTimeWindows ?? [],
    doList: params.structured?.do ?? [],
    avoidList: params.structured?.avoid ?? [],
    waitList: params.structured?.wait ?? [],
    dashaContext: params.dashaContext,
    wasPaid: params.wasPaid,
    createdAt: FieldValue.serverTimestamp(),
  });
}
