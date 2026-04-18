import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { ALIA_SYSTEM_PROMPT, buildChartContext, buildTransitContext } from "@/lib/alia";
import { getCurrentTransits, parseBirthDataString } from "@/lib/astrology";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue, Timestamp as FsTimestamp } from "firebase-admin/firestore";
import {
  checkQuota,
  incrementFreeQuestions,
  incrementPaidQuestions,
  FREE_QUESTION_LIMIT,
} from "@/lib/quota";
import { appendToSheet } from "@/lib/sheets";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const STRUCTURED_OUTPUT_INSTRUCTION = `
After your answer, append this JSON block — no markdown, no fences:
---STRUCTURED---
{"confidenceScore":85,"bestTimeWindows":["Next 3 days"],"do":["One action"],"avoid":["One thing"],"wait":[]}
---END---

Rules:
- confidenceScore: 0-100
- bestTimeWindows: 1-2 items max
- do: 1-2 items max
- avoid: 1 item max
- wait: 0-1 items (usually empty)
Always include this block.`;

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
          message: "You have used your free question. Upgrade for unlimited access.",
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

    const db = getDb();

    try {
      const [userSnap, chartSnap] = await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(userId).get(),
        db.collection(COLLECTIONS.CHARTS).doc(userId).get(),
      ]);

      if (userSnap.exists && chartSnap.exists) {
        const user  = userSnap.data()!;
        const chart = chartSnap.data()!;
        profileData = {
          name:          user.name          ?? "",
          chart_data:    chart.chartData    ?? "",
          dasha_data:    chart.dashaData    ?? "",
          chart_context: chart.chartContext ?? "",
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

    if (profileData) {
      // Use pre-built chartContext stored at onboarding time
      if (profileData.chart_context) {
        chartContext = profileData.chart_context;
      } else if (profileData.chart_data) {
        try {
          const cd = JSON.parse(profileData.chart_data);
          chartContext = cd.chartContext ?? buildChartContext(cd);
        } catch {
          chartContext = buildChartContext(profileData.chart_data as unknown as Record<string, unknown>);
        }
      }

      if (profileData.dasha_data) {
        try {
          const dasha = JSON.parse(profileData.dasha_data);
          const parts = [
            dasha.mahadasha_lord  ? `Mahadasha: ${dasha.mahadasha_lord} (ends ${dasha.mahadasha_end})`  : "",
            dasha.antardasha_lord ? `Antardasha: ${dasha.antardasha_lord} (ends ${dasha.antardasha_end})` : "",
          ].filter(Boolean);
          dashaContext = parts.join(" | ");
        } catch {
          // ignore
        }
      }
    }

    // Load 24-hour memory for paid users (last 5 Q&A pairs)
    let memoryContext = "";
    if (quota.wasPaid) {
      try {
        const since = Date.now() - 24 * 60 * 60 * 1000;
        const memSnap = await db
          .collection(COLLECTIONS.QUESTIONS)
          .where("userId", "==", userId)
          .where("createdAt", ">=", FsTimestamp.fromMillis(since))
          .orderBy("createdAt", "desc")
          .limit(5)
          .get();

        if (!memSnap.empty) {
          const pairs = memSnap.docs
            .reverse()
            .map((d: FirebaseFirestore.QueryDocumentSnapshot) => {
              const data = d.data();
              const cleanAnswer = (data.answer as string)
                .replace(/---STRUCTURED---[\s\S]*?---END---/g, "")
                .trim()
                .slice(0, 300);
              return `Q: ${data.question}\nA: ${cleanAnswer}`;
            })
            .join("\n\n");
          memoryContext = `\nCONVERSATION MEMORY (last 24 hours):\n${pairs}\n(Reference this context naturally — do not repeat it verbatim.)`;
        }
      } catch {
        // Memory load failed — continue without it
      }
    }

    const systemPrompt = [
      ALIA_SYSTEM_PROMPT,
      profileData?.name ? `\nUser's name: ${profileData.name}` : "",
      chartContext,
      transitContext,
      dashaContext ? `\nCURRENT DASHA:\n${dashaContext}` : "",
      memoryContext,
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
      max_tokens: 600,
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

          appendToSheet({
            event: "question",
            userId,
            email: session.user.email ?? "",
            meta: { question: questionText, category: category ?? "" },
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
