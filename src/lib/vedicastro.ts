// VedicAstroAPI v3 — https://api.vedicastroapi.com/v3-json
// Using only endpoints available on current plan:
//   GET /utilities/geo-search
//   GET /extended-horoscope/find-ascendant
//   GET /extended-horoscope/find-moon-sign
//   GET /extended-horoscope/find-sun-sign
//   GET /horoscope/planets-in-houses
//   GET /dashas/current-mahadasha

const BASE_URL = "https://api.vedicastroapi.com/v3-json";

function getKey() {
  const key = process.env.VEDICASTRO_API_KEY;
  if (!key) throw new Error("VEDICASTRO_API_KEY is not set");
  return key.trim(); // strip any accidental whitespace/newlines
}

export interface VedicBirthParams {
  dob: string;  // DD/MM/YYYY
  tob: string;  // HH:MM  (24h)
  lat: number;
  lon: number;
  tz: number;   // UTC offset e.g. 5.5 for IST
}

async function vGet(path: string, params: Record<string, string | number>) {
  const url = new URL(`${BASE_URL}${path}`);
  url.searchParams.set("api_key", getKey());
  url.searchParams.set("lang", "en");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`VedicAstroAPI HTTP ${res.status} at ${path}`);
  const json = await res.json();
  if (json.status !== 200) throw new Error(`VedicAstroAPI status ${json.status} at ${path}`);
  return json.response;
}

// ── Geo search ───────────────────────────────────────────────────────────────
// Response: { name, coordinates: ["lat","lon"], tz: 5.5, ... }
export async function geoSearch(
  city: string
): Promise<{ lat: number; lon: number; tz: number; name: string }> {
  const cityOnly = city.split(",")[0].trim();
  const url = new URL(`${BASE_URL}/utilities/geo-search`);
  url.searchParams.set("api_key", getKey());
  url.searchParams.set("city", cityOnly);
  url.searchParams.set("lang", "en");

  const res  = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Geo-search HTTP ${res.status}`);
  const json = await res.json();

  const data = Array.isArray(json.response) ? json.response[0] : json.response;
  if (!data) throw new Error(`City not found: ${city}`);

  const coords: string[] = Array.isArray(data.coordinates) ? data.coordinates : [];
  return {
    lat:  parseFloat(coords[0] ?? "0"),
    lon:  parseFloat(coords[1] ?? "0"),
    tz:   parseFloat(String(data.tz ?? "5.5")),
    name: String(data.name ?? cityOnly),
  };
}

const BIRTH_PARAMS = (p: VedicBirthParams) => ({
  dob: p.dob, tob: p.tob, lat: p.lat, lon: p.lon, tz: p.tz,
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Full chart data fetch (sequential to avoid API rate limits) ──────────────
export async function fetchFullChart(p: VedicBirthParams) {
  const bp = BIRTH_PARAMS(p);

  const ascResp   = await vGet("/extended-horoscope/find-ascendant", bp);
  await sleep(150);
  const moonResp  = await vGet("/extended-horoscope/find-moon-sign",  bp);
  await sleep(150);
  const sunResp   = await vGet("/extended-horoscope/find-sun-sign",   bp);
  await sleep(150);
  const housesResp = await vGet("/horoscope/planets-in-houses",       bp);
  await sleep(150);
  const dashaResp  = await vGet("/dashas/current-mahadasha",          bp);

  return { ascResp, moonResp, sunResp, housesResp, dashaResp };
}

// ── Normalize planets-in-houses into our storage format ─────────────────────
export interface HouseData {
  house:    number;
  sign:     string;
  planets:  string[];
}

export function normalizeHouses(
  raw: Record<string, { house: string; zodiac: string; planets: string[] }>
): HouseData[] {
  return Object.values(raw).map((h) => ({
    house:   Number(h.house),
    sign:    String(h.zodiac  ?? ""),
    planets: Array.isArray(h.planets) ? h.planets : [],
  }));
}

// ── Parse current dasha ───────────────────────────────────────────────────────
export interface DashaInfo {
  mahadasha_lord:   string;
  mahadasha_end:    string;
  antardasha_lord:  string;
  antardasha_end:   string;
}

export function parseDasha(dashaResp: Record<string, unknown>): DashaInfo {
  const maha  = (dashaResp.mahadasha  ?? {}) as Record<string, string>;
  const antar = (dashaResp.antardasha ?? {}) as Record<string, string>;

  // end date looks like "Thu Dec 07 2034 05:32:11 GMT+0000..."
  const shortDate = (s: string) => {
    if (!s) return "";
    const match = s.match(/(\w+ \w+ \d+ \d{4})/);
    return match ? match[1] : s.split(" GMT")[0].trim();
  };

  return {
    mahadasha_lord:  String(maha.name  ?? maha.key  ?? ""),
    mahadasha_end:   shortDate(String(maha.end   ?? "")),
    antardasha_lord: String(antar.name ?? antar.key ?? ""),
    antardasha_end:  shortDate(String(antar.end  ?? "")),
  };
}

// ── Build rich plain-text chart context for Claude ────────────────────────────
export function buildVedicChartContext(
  risingSign: string,
  moonSign:   string,
  sunSign:    string,
  houses:     HouseData[],
  dasha:      DashaInfo
): string {
  const lines: string[] = ["VEDIC BIRTH CHART (Jyotish — Lahiri ayanamsa):"];
  lines.push(`  Rising (Ascendant) : ${risingSign}`);
  lines.push(`  Moon sign          : ${moonSign}`);
  lines.push(`  Sun sign           : ${sunSign}`);
  lines.push("");
  lines.push("PLANETARY POSITIONS (house → sign → planets):");

  for (const h of houses.sort((a, b) => a.house - b.house)) {
    const planetsStr = h.planets.length ? h.planets.join(", ") : "—";
    lines.push(`  House ${String(h.house).padEnd(2)} | ${h.sign.padEnd(12)} | ${planetsStr}`);
  }

  lines.push("");
  lines.push("CURRENT VIMSHOTTARI DASHA:");
  lines.push(`  Mahadasha  : ${dasha.mahadasha_lord}  (ends ${dasha.mahadasha_end})`);
  if (dasha.antardasha_lord) {
    lines.push(`  Antardasha : ${dasha.antardasha_lord}  (ends ${dasha.antardasha_end})`);
  }

  return lines.join("\n");
}
