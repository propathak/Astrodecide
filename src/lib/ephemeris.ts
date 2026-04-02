// Built-in Vedic astrology calculations — no external API needed
// Based on simplified Swiss Ephemeris approximations

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const NAKSHATRAS = [
  "Ashwini", "Bharani", "Krittika", "Rohini", "Mrigashira", "Ardra",
  "Punarvasu", "Pushya", "Ashlesha", "Magha", "Purva Phalguni", "Uttara Phalguni",
  "Hasta", "Chitra", "Swati", "Vishakha", "Anuradha", "Jyeshtha",
  "Mula", "Purva Ashadha", "Uttara Ashadha", "Shravana", "Dhanishtha", "Shatabhisha",
  "Purva Bhadrapada", "Uttara Bhadrapada", "Revati",
];

const DASHA_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];
const DASHA_YEARS = [7, 20, 6, 10, 7, 18, 16, 19, 17];

interface PlanetData {
  name: string;
  sign: string;
  house: number;
  nakshatra: string;
  degree: number;
  full_degree: number;
  retrograde: boolean;
}

interface ChartResult {
  planets: PlanetData[];
  ascendant: { sign: string; degree: number };
  sun: { sign: string };
  moon: { sign: string };
  dasha: { planet: string; end_date: string };
}

// Julian Day Number
function toJulian(year: number, month: number, day: number, hour: number = 12): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + hour / 24 + B - 1524.5;
}

// Ayanamsha (Lahiri) — sidereal correction
function getLahiriAyanamsha(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return 23.85 + 0.013969 * T;
}

// Normalize degree to 0-360
function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function degToSign(deg: number): { sign: string; degree: number; nakshatra: string } {
  const d = norm(deg);
  const signIdx = Math.floor(d / 30);
  const degree = d % 30;
  const nakshatraIdx = Math.floor(d / (360 / 27));
  return {
    sign: ZODIAC_SIGNS[signIdx],
    degree: Math.round(degree * 100) / 100,
    nakshatra: NAKSHATRAS[nakshatraIdx % 27],
  };
}

function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L = norm(280.46646 + 36000.76983 * T);
  const M = norm(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const Mr = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr);
  return norm(L + C);
}

function moonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L = norm(218.3165 + 481267.8813 * T);
  const M = norm(134.9634 + 477198.8676 * T);
  const F = norm(93.2721 + 483202.0175 * T);
  const D = norm(297.8502 + 445267.1115 * T);
  const Mr = M * Math.PI / 180;
  const Fr = F * Math.PI / 180;
  const Dr = D * Math.PI / 180;
  return norm(L
    + 6.2888 * Math.sin(Mr)
    + 1.2740 * Math.sin(2 * Dr - Mr)
    + 0.6583 * Math.sin(2 * Dr)
    + 0.2136 * Math.sin(2 * Mr)
    - 0.1851 * Math.sin(D)
    - 0.1143 * Math.sin(2 * Fr)
  );
}

function planetLongitude(planet: string, jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean longitudes and daily motions (simplified)
  const data: Record<string, [number, number]> = {
    Mercury: [252.2509, 149472.6746],
    Venus:   [181.9798, 58517.8156],
    Mars:    [355.4330, 19140.2993],
    Jupiter: [ 34.3515,  3034.9057],
    Saturn:  [ 50.0774,  1222.1138],
  };
  if (!data[planet]) return 0;
  const [L0, n] = data[planet];
  return norm(L0 + n * T);
}

function rahuLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  return norm(125.0445 - 1934.1363 * T);
}

function ascendantLongitude(jd: number, lat: number, lon: number): number {
  // Local Sidereal Time
  const T = (jd - 2451545.0) / 36525.0;
  const GMST = norm(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
  const LST = norm(GMST + lon);
  const e = (23.439291111 - 0.013004167 * T) * Math.PI / 180;
  const LSTr = LST * Math.PI / 180;
  const latr = lat * Math.PI / 180;
  const ascRad = Math.atan2(Math.cos(LSTr), -(Math.sin(LSTr) * Math.cos(e) + Math.tan(latr) * Math.sin(e)));
  return norm(ascRad * 180 / Math.PI);
}

export function calculateChart(
  day: number, month: number, year: number,
  hour: number, min: number,
  lat: number, lon: number, tzone: number = 5.5
): ChartResult {
  const utHour = hour + min / 60 - tzone;
  const jd = toJulian(year, month, day, utHour);
  const ayanamsha = getLahiriAyanamsha(jd);

  function sidereal(tropical: number) {
    return norm(tropical - ayanamsha);
  }

  const rawPlanets: Array<{ name: string; tropical: number; retrograde?: boolean }> = [
    { name: "Sun",     tropical: sunLongitude(jd) },
    { name: "Moon",    tropical: moonLongitude(jd) },
    { name: "Mercury", tropical: planetLongitude("Mercury", jd) },
    { name: "Venus",   tropical: planetLongitude("Venus", jd) },
    { name: "Mars",    tropical: planetLongitude("Mars", jd) },
    { name: "Jupiter", tropical: planetLongitude("Jupiter", jd) },
    { name: "Saturn",  tropical: planetLongitude("Saturn", jd) },
    { name: "Rahu",    tropical: rahuLongitude(jd), retrograde: true },
  ];

  const ascTropical = ascendantLongitude(jd, lat, lon);
  const ascSidereal = sidereal(ascTropical);
  const ascSignIdx = Math.floor(ascSidereal / 30);

  // Compute houses (equal house system from ascendant)
  function getHouse(sidLong: number): number {
    const diff = norm(sidLong - ascSidereal);
    return Math.floor(diff / 30) + 1;
  }

  const planets: PlanetData[] = rawPlanets.map((p) => {
    const sid = sidereal(p.tropical);
    const { sign, degree, nakshatra } = degToSign(sid);
    return {
      name: p.name,
      sign,
      house: getHouse(sid),
      nakshatra,
      degree,
      full_degree: sid,
      retrograde: p.retrograde ?? false,
    };
  });

  // Ketu = Rahu + 180
  const rahu = planets.find((p) => p.name === "Rahu")!;
  const ketuSid = norm(rahu.full_degree + 180);
  const { sign: ketuSign, degree: ketuDeg, nakshatra: ketuNak } = degToSign(ketuSid);
  planets.push({
    name: "Ketu",
    sign: ketuSign,
    house: getHouse(ketuSid),
    nakshatra: ketuNak,
    degree: ketuDeg,
    full_degree: ketuSid,
    retrograde: true,
  });

  // Ascendant
  const { sign: ascSign, degree: ascDeg } = degToSign(ascSidereal);

  // Moon sign for Dasha
  const moon = planets.find((p) => p.name === "Moon")!;
  const moonDeg = moon.full_degree;
  const nakshatraIdx = Math.floor(moonDeg / (360 / 27));
  const dashaStart = nakshatraIdx % 9;

  // Calculate current dasha
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  const yearsPassed = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);

  let cumulativeYears = 0;
  const dashaFractionInFirst = 1 - (moonDeg % (360 / 27)) / (360 / 27);
  let dashaIdx = dashaStart;
  let firstDashaYears = DASHA_YEARS[dashaIdx] * dashaFractionInFirst;
  cumulativeYears = firstDashaYears;

  if (yearsPassed <= cumulativeYears) {
    // still in birth dasha
  } else {
    let y = firstDashaYears;
    dashaIdx = (dashaStart + 1) % 9;
    while (y < yearsPassed) {
      y += DASHA_YEARS[dashaIdx];
      if (y >= yearsPassed) break;
      dashaIdx = (dashaIdx + 1) % 9;
    }
  }

  const dashaEndYear = today.getFullYear() + Math.ceil(DASHA_YEARS[dashaIdx] / 2);

  return {
    planets,
    ascendant: { sign: ascSign, degree: ascDeg },
    sun: { sign: planets.find((p) => p.name === "Sun")!.sign },
    moon: { sign: moon.sign },
    dasha: {
      planet: DASHA_ORDER[dashaIdx],
      end_date: `${dashaEndYear}`,
    },
  };
}
