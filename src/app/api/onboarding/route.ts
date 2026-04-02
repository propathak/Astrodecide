import { NextRequest, NextResponse } from "next/server";
import { geocodeCity, parseBirthDataString } from "@/lib/astrology";
import { calculateChart } from "@/lib/ephemeris";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, dob, tob, pob } = body as {
      name: string;
      dob: string;
      tob: string;
      pob: string;
    };

    if (!name || !dob || !tob || !pob) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Geocode place of birth
    const { lat, lon, tzone } = await geocodeCity(pob);

    // Parse birth data
    const birthData = parseBirthDataString(dob, tob, lat, lon, tzone);

    // Calculate chart using built-in ephemeris (no external API needed)
    const chartResult = calculateChart(
      birthData.day, birthData.month, birthData.year,
      birthData.hour, birthData.min,
      lat, lon, tzone
    );

    // Format planets to match expected schema
    const planets = chartResult.planets.map((p) => ({
      name: p.name,
      sign: p.sign,
      house: p.house,
      nakshatra: p.nakshatra,
      full_degree: p.full_degree,
      degree: p.degree,
      isRetro: p.retrograde,
      retrograde: p.retrograde,
    }));

    // Add ascendant as a planet entry
    planets.unshift({
      name: "Ascendant",
      sign: chartResult.ascendant.sign,
      house: 1,
      nakshatra: "",
      full_degree: chartResult.ascendant.degree,
      degree: chartResult.ascendant.degree,
      isRetro: false,
      retrograde: false,
    });

    const dashaData = JSON.stringify({
      mahadasha_lord: chartResult.dasha.planet,
      mahadasha_end: chartResult.dasha.end_date,
    });

    const profileData = {
      name,
      dob,
      tob,
      pob,
      lat,
      lon,
      tzone,
      ascendant_sign: chartResult.ascendant.sign,
      sun_sign: chartResult.sun.sign,
      moon_sign: chartResult.moon.sign,
      chart_data: JSON.stringify(planets),
      dasha_data: dashaData,
      created_at: new Date().toISOString(),
    };

    // Return success with basic chart summary
    const response = NextResponse.json({
      success: true,
      summary: {
        ascendant: chartResult.ascendant.sign,
        sun: chartResult.sun.sign,
        moon: chartResult.moon.sign,
      },
    });

    // Store profile in a simple cookie for demo use
    response.cookies.set("astro_profile", JSON.stringify(profileData), {
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: "Failed to process birth data" },
      { status: 500 }
    );
  }
}
