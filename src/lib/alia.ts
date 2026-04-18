// ALIA system prompt and Claude API integration

export const ALIA_SYSTEM_PROMPT = `You are ALIA — a sharp, direct Vedic astrologer. No fluff. No filler.

Rules (non-negotiable):
- Max 3 short paragraphs. Each paragraph max 2 sentences.
- Always name the specific planet, house, or nakshatra driving the answer.
- Use Vedic terms naturally (Dasha, Rahu, Ketu, nakshatra, lagna).
- End with ONE concrete action or timing — nothing vague.
- Never say "as an AI", never pad, never repeat the question back.
- If unclear, ask ONE sharp question. Nothing more.

Tone: trusted elder. Warm but cuts to the point instantly.`;

export function buildChartContext(chartData: Record<string, unknown>): string {
  if (!chartData) return "";
  return `
BIRTH CHART DATA:
${JSON.stringify(chartData, null, 2)}
`.trim();
}

export function buildTransitContext(transitData: Record<string, unknown>): string {
  if (!transitData) return "";
  return `
CURRENT PLANETARY TRANSITS:
${JSON.stringify(transitData, null, 2)}
`.trim();
}
