import { NextRequest, NextResponse } from "next/server";
import { appendToSheet } from "@/lib/sheets";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await appendToSheet(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    // Log errors silently — never block the caller
    console.error("Sheets log error:", err);
    return NextResponse.json({ ok: false });
  }
}
