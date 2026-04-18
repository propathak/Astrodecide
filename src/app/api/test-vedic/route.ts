import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.VEDICASTRO_API_KEY ?? "";
  const base = "https://api.vedicastroapi.com/v3-json";

  // Build URL the same way vGet does
  const url = new URL(`${base}/extended-horoscope/find-ascendant`);
  url.searchParams.set("api_key", key);
  url.searchParams.set("lang", "en");
  url.searchParams.set("dob", "15/08/1990");
  url.searchParams.set("tob", "10:30");
  url.searchParams.set("lat", "19.07283");
  url.searchParams.set("lon", "72.88261");
  url.searchParams.set("tz", "5.5");

  const builtUrl = url.toString();
  const rawUrl = `${base}/extended-horoscope/find-ascendant?api_key=${key}&dob=15%2F08%2F1990&tob=10%3A30&lat=19.07283&lon=72.88261&tz=5.5&lang=en`;

  const r1 = await fetch(rawUrl,   { cache: "no-store" });
  const r2 = await fetch(builtUrl, { cache: "no-store" });
  const [j1, j2] = await Promise.all([r1.json(), r2.json()]);

  return NextResponse.json({
    raw_url_status:   j1.status,
    built_url_status: j2.status,
    key_set: !!key,
    key_preview: key.slice(0,8) + "...",
    built_url_sample: builtUrl.slice(0, 120),
  });
}
