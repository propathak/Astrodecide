"use client";

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer",
  "Leo", "Virgo", "Libra", "Scorpio",
  "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

// \uFE0E forces text (monochrome) rendering instead of emoji color rendering
const ZODIAC_SYMBOLS = ["♈\uFE0E", "♉\uFE0E", "♊\uFE0E", "♋\uFE0E", "♌\uFE0E", "♍\uFE0E", "♎\uFE0E", "♏\uFE0E", "♐\uFE0E", "♑\uFE0E", "♒\uFE0E", "♓\uFE0E"];

const PLANET_GLYPHS: Record<string, string> = {
  Sun: "☉\uFE0E", Moon: "☽\uFE0E", Mercury: "☿\uFE0E", Venus: "♀\uFE0E",
  Mars: "♂\uFE0E", Jupiter: "♃\uFE0E", Saturn: "♄\uFE0E", Rahu: "☊\uFE0E", Ketu: "☋\uFE0E",
};

interface PlanetPosition {
  planet: string;
  sign: string;
  degree: number;
  house: number;
}

interface Props {
  planets?: PlanetPosition[];
  ascendantSign?: string;
}

export default function ChartWheel({ planets = [], ascendantSign = "Aries" }: Props) {
  const cx = 160;
  const cy = 160;
  const outerR = 150;
  const middleR = 115;
  const innerR = 80;
  const size = 320;

  // Ascendant determines house 1 offset
  const ascIdx = ZODIAC_SIGNS.indexOf(ascendantSign);

  function signAngle(signIdx: number): number {
    // Each sign = 30 degrees. 0 degrees = right (3 o'clock).
    // Ascendant sign starts at 180 degrees (left = 9 o'clock for Vedic-style)
    const relIdx = (signIdx - ascIdx + 12) % 12;
    return (180 + relIdx * 30) * (Math.PI / 180);
  }

  function polarToXY(angle: number, r: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // House lines (12 divisions)
  const houseLines = Array.from({ length: 12 }, (_, i) => {
    const angle = signAngle(i + ascIdx);
    const outer = polarToXY(angle, outerR);
    const inner = polarToXY(angle, innerR);
    return { outer, inner };
  });

  // Sign labels — placed at mid-point of each 30° segment
  const signLabels = ZODIAC_SIGNS.map((sign, i) => {
    const midAngle = signAngle(i + ascIdx) + (15 * Math.PI) / 180;
    const pos = polarToXY(midAngle, (outerR + middleR) / 2);
    return { sign, symbol: ZODIAC_SYMBOLS[i], pos };
  });

  // Planet positions
  const planetMarkers = planets.map((p) => {
    const signIdx = ZODIAC_SIGNS.indexOf(p.sign);
    if (signIdx === -1) return null;
    const baseAngle = signAngle(signIdx + ascIdx);
    const angle = baseAngle + (p.degree * Math.PI) / 180;
    const pos = polarToXY(angle, (middleR + innerR) / 2);
    return { ...p, pos };
  }).filter(Boolean);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: "320px", display: "block", margin: "0 auto" }}
      aria-label="Vedic birth chart wheel"
    >
      {/* Outer circle */}
      <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="#1A1A1A" strokeWidth="1" />
      {/* Middle circle */}
      <circle cx={cx} cy={cy} r={middleR} fill="none" stroke="#1A1A1A" strokeWidth="1" />
      {/* Inner circle */}
      <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="#333333" strokeWidth="0.5" />

      {/* House dividing lines */}
      {houseLines.map((line, i) => (
        <line
          key={i}
          x1={line.inner.x}
          y1={line.inner.y}
          x2={line.outer.x}
          y2={line.outer.y}
          stroke="#1A1A1A"
          strokeWidth="0.5"
        />
      ))}

      {/* Zodiac sign symbols */}
      {signLabels.map((s, i) => (
        <text
          key={i}
          x={s.pos.x}
          y={s.pos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="10"
          fill="#444444"
          fontFamily="serif"
        >
          {s.symbol}
        </text>
      ))}

      {/* Planet markers */}
      {planetMarkers.map((p, i) => p && (
        <g key={i}>
          <circle cx={p.pos.x} cy={p.pos.y} r="10" fill="none" stroke="#333333" strokeWidth="0.5" />
          <text
            x={p.pos.x}
            y={p.pos.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="9"
            fill="#ffffff"
            fontFamily="serif"
          >
            {PLANET_GLYPHS[p.planet] ?? p.planet[0]}
          </text>
        </g>
      ))}

      {/* Ascendant marker */}
      <text
        x={cx - innerR + 8}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="8"
        fill="#888888"
        fontFamily="'Inter', sans-serif"
        letterSpacing="1"
      >
        ASC
      </text>
    </svg>
  );
}
