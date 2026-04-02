// AstrologyAPI.com integration

const BASE_URL = "https://json.astrologyapi.com/v1";

interface BirthData {
  day: number;
  month: number;
  year: number;
  hour: number;
  min: number;
  lat: number;
  lon: number;
  tzone: number;
}

async function astroRequest(endpoint: string, body: BirthData) {
  const userId = process.env.ASTROLOGY_API_USER_ID;
  const apiKey = process.env.ASTROLOGY_API_KEY;

  if (!userId || !apiKey) {
    throw new Error("AstrologyAPI credentials not configured");
  }

  const credentials = Buffer.from(`${userId}:${apiKey}`).toString("base64");

  const res = await fetch(`${BASE_URL}/${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`AstrologyAPI error: ${res.status}`);
  }

  return res.json();
}

export async function getPlanetPositions(birthData: BirthData) {
  return astroRequest("planets", birthData);
}

export async function getBirthChart(birthData: BirthData) {
  return astroRequest("natal_wheel_chart", birthData);
}

export async function getCurrentTransits(birthData: BirthData) {
  const now = new Date();
  const transitData: BirthData = {
    ...birthData,
    day: now.getDate(),
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    hour: now.getHours(),
    min: now.getMinutes(),
  };
  return astroRequest("current_planets", transitData);
}

export async function getDashaperiods(birthData: BirthData) {
  return astroRequest("current_vdasha", birthData);
}

export async function getNakshatra(birthData: BirthData) {
  return astroRequest("nakshatra_details", birthData);
}

export function parseBirthDataString(
  dob: string,   // DD/MM/YYYY
  tob: string,   // HH:MM
  lat: number,
  lon: number,
  tzone: number = 5.5  // IST default; adjust per location
): BirthData {
  const [day, month, year] = dob.split("/").map(Number);
  const [hour, min] = tob.split(":").map(Number);
  return { day, month, year, hour, min, lat, lon, tzone };
}

// Geocode a city name to lat/lon using a free geocoding service
export async function geocodeCity(city: string): Promise<{ lat: number; lon: number; tzone: number }> {
  const encoded = encodeURIComponent(city);
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
    { headers: { "User-Agent": "AstroDecide/1.0" } }
  );
  const data = await res.json();
  if (!data || data.length === 0) {
    throw new Error(`Could not geocode: ${city}`);
  }
  const { lat, lon } = data[0];
  // Rough timezone from longitude
  const tzone = Math.round(parseFloat(lon) / 15 * 2) / 2;
  return { lat: parseFloat(lat), lon: parseFloat(lon), tzone };
}
