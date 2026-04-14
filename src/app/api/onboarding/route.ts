import { NextRequest, NextResponse } from "next/server";
import { geocodeCity, parseBirthDataString } from "@/lib/astrology";
import { calculateChart } from "@/lib/ephemeris";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";

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

    // Calculate chart using built-in ephemeris
    const chartResult = calculateChart(
      birthData.day, birthData.month, birthData.year,
      birthData.hour, birthData.min,
      lat, lon, tzone
    );

    // Format planets
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

    // Persist to Firestore if user is authenticated
    const session = await auth();
    if (session?.user?.id) {
      const db = getDb();
      const userId = session.user.id;

      // Update user doc
      await db.collection(COLLECTIONS.USERS).doc(userId).update({
        name,
        dob,
        tob,
        pob,
        lat,
        lon,
        tzone,
        onboardingDone: true,
      });

      // Write chart doc
      await db.collection(COLLECTIONS.CHARTS).doc(userId).set({
        userId,
        chartData: JSON.stringify(planets),
        dashaData,
        ascendantSign: chartResult.ascendant.sign,
        sunSign: chartResult.sun.sign,
        moonSign: chartResult.moon.sign,
        computedAt: FieldValue.serverTimestamp(),
        source: "ephemeris",
      });

      // Fire-and-forget log
      fetch(`${process.env.NEXTAUTH_URL}/api/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "onboarding",
          userId,
          email: session.user.email ?? "",
          meta: { name, pob },
        }),
      }).catch(() => {});
    }

    const response = NextResponse.json({
      success: true,
      summary: {
        ascendant: chartResult.ascendant.sign,
        sun: chartResult.sun.sign,
        moon: chartResult.moon.sign,
      },
    });

    // Keep cookie for backward compat (anonymous fallback)
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
