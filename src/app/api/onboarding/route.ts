import { NextRequest, NextResponse } from "next/server";
import {
  geoSearch,
  fetchFullChart,
  normalizeHouses,
  parseDasha,
  buildVedicChartContext,
  VedicBirthParams,
} from "@/lib/vedicastro";
import { auth } from "@/lib/auth";
import { getDb, COLLECTIONS } from "@/lib/firebase";
import { FieldValue } from "firebase-admin/firestore";
import { appendToSheet } from "@/lib/sheets";

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

    // ── Step 1: Geocode city ──────────────────────────────────────────────
    let lat: number, lon: number, tz: number;

    try {
      ({ lat, lon, tz } = await geoSearch(pob));
    } catch (geoErr) {
      console.error("[onboarding] geo-search failed, trying Nominatim:", geoErr);
      const cityOnly = pob.split(",")[0].trim();
      const geoRes   = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cityOnly)}&format=json&limit=1`,
        { headers: { "User-Agent": "AstroDecide/1.0" } }
      );
      const geoData = await geoRes.json();
      if (!geoData?.length) {
        return NextResponse.json({ error: "City not found. Please try again." }, { status: 400 });
      }
      lat = parseFloat(geoData[0].lat);
      lon = parseFloat(geoData[0].lon);
      tz  = Math.round((lon / 15) * 2) / 2;
    }

    const params: VedicBirthParams = { dob, tob, lat, lon, tz };

    // ── Step 2: Fetch full chart from VedicAstroAPI ───────────────────────
    const { ascResp, moonResp, sunResp, housesResp, dashaResp } =
      await fetchFullChart(params);

    const risingSign = String(ascResp.ascendant  ?? "");
    const moonSign   = String(moonResp.moon_sign  ?? "");
    const sunSign    = String(sunResp.sun_sign    ?? "");

    const houses  = normalizeHouses(housesResp as Record<string, { house: string; zodiac: string; planets: string[] }>);
    const dasha   = parseDasha(dashaResp as Record<string, unknown>);

    // ── Step 3: Build chart_data for storage and Claude ───────────────────
    const chartContext = buildVedicChartContext(risingSign, moonSign, sunSign, houses, dasha);

    const chartData = JSON.stringify({
      rising:  risingSign,
      moon:    moonSign,
      sun:     sunSign,
      houses,
      chartContext,
    });

    const dashaData = JSON.stringify({
      mahadasha_lord:  dasha.mahadasha_lord,
      mahadasha_end:   dasha.mahadasha_end,
      antardasha_lord: dasha.antardasha_lord,
      antardasha_end:  dasha.antardasha_end,
    });

    const profileData = {
      name,
      dob,
      tob,
      pob,
      lat,
      lon,
      tzone:          tz,
      ascendant_sign: risingSign,
      sun_sign:       sunSign,
      moon_sign:      moonSign,
      chart_data:     chartData,
      dasha_data:     dashaData,
      created_at:     new Date().toISOString(),
    };

    // ── Step 4: Persist to Firestore ──────────────────────────────────────
    const session = await auth();
    if (session?.user?.id) {
      const db     = getDb();
      const userId = session.user.id;

      await Promise.all([
        db.collection(COLLECTIONS.USERS).doc(userId).set(
          { name, dob, tob, pob, lat, lon, tzone: tz, onboardingDone: true },
          { merge: true }
        ),
        db.collection(COLLECTIONS.CHARTS).doc(userId).set({
          userId,
          chartData,
          dashaData,
          ascendantSign: risingSign,
          sunSign,
          moonSign,
          chartContext,
          computedAt:    FieldValue.serverTimestamp(),
          source:        "vedicastroapi",
        }),
      ]);

      appendToSheet({
        event: "onboarding",
        userId,
        email: session.user.email ?? "",
        meta:  { name, pob },
      }).catch(() => {});
    }

    // ── Step 5: Respond ───────────────────────────────────────────────────
    const response = NextResponse.json({
      success: true,
      summary: { ascendant: risingSign, sun: sunSign, moon: moonSign },
    });

    response.cookies.set("astro_profile", JSON.stringify(profileData), {
      maxAge:   60 * 60 * 24 * 365,
      httpOnly: false,
      path:     "/",
    });

    return response;
  } catch (err) {
    console.error("[onboarding] error:", err);
    return NextResponse.json(
      { error: "Failed to calculate your birth chart. Please try again.", detail: String(err) },
      { status: 500 }
    );
  }
}
