import { NextRequest, NextResponse } from "next/server";
import { parseBirthDataString, getPlanetPositions } from "@/lib/astrology";

export async function GET(req: NextRequest) {
  try {
    const profileCookie = req.cookies.get("astro_profile")?.value;

    if (!profileCookie) {
      return NextResponse.json({ chart: null });
    }

    let profileData: Record<string, string>;
    try {
      profileData = JSON.parse(profileCookie);
    } catch {
      return NextResponse.json({ chart: null });
    }

    // Return cached chart data if available
    if (profileData.chart_data) {
      const planets = JSON.parse(profileData.chart_data);

      // Transform to our format
      const formattedPlanets = planets
        .filter((p: Record<string, unknown>) => p.name !== "Ascendant" && p.name !== "Lagna")
        .map((p: Record<string, unknown>) => ({
          planet: String(p.name),
          sign: String(p.sign),
          house: Number(p.house),
          nakshatra: String(p.nakshatra || p.nakshatraName || ""),
          degree: String(typeof p.full_degree === "number" ? p.full_degree.toFixed(2) : p.degree || "0"),
          retrograde: Boolean(p.isRetro || p.retrograde),
        }));

      const ascendant = planets.find(
        (p: Record<string, unknown>) => p.name === "Ascendant" || p.name === "Lagna"
      );
      const sun = planets.find((p: Record<string, unknown>) => p.name === "Sun");
      const moon = planets.find((p: Record<string, unknown>) => p.name === "Moon");

      return NextResponse.json({
        chart: {
          planets: formattedPlanets,
          ascendant: {
            sign: String(ascendant?.sign || profileData.ascendant_sign || "Aries"),
            degree: String(typeof ascendant?.full_degree === "number" ? ascendant.full_degree.toFixed(2) : "0"),
          },
          sun: { sign: String(sun?.sign || profileData.sun_sign || "") },
          moon: { sign: String(moon?.sign || profileData.moon_sign || "") },
        },
      });
    }

    // Fetch fresh if not cached
    if (profileData.dob && profileData.tob && profileData.lat && profileData.lon) {
      const birthData = parseBirthDataString(
        profileData.dob,
        profileData.tob,
        parseFloat(profileData.lat),
        parseFloat(profileData.lon),
        parseFloat(profileData.tzone ?? "5.5")
      );

      const planets = await getPlanetPositions(birthData);
      return NextResponse.json({ chart: { planets, ascendant: {}, sun: {}, moon: {} } });
    }

    return NextResponse.json({ chart: null });
  } catch (err) {
    console.error("Chart API error:", err);
    return NextResponse.json({ chart: null });
  }
}
