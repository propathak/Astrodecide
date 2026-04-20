"use client";

import type { AreaData } from "@/app/api/dashboard/route";

// Wider canvas so side labels never clip
const W     = 300;
const H     = 250;
const CX    = W / 2;      // 150
const CY    = H / 2 - 4;  // 121
const R     = 72;          // radar radius — smaller so labels have room
const LEVELS = 4;

function scoreColor(score: number): string {
  if (score >= 65) return "#4ade80";
  if (score >= 40) return "#fbbf24";
  return "#f87171";
}

// angle in degrees, 0 = top (like a clock)
function polar(angleDeg: number, r: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [CX + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

// 5 axes, 72° apart, starting at top
const ANGLES = [0, 72, 144, 216, 288];

function pts(points: [number, number][]): string {
  return points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(" ");
}

interface Props {
  areas:         AreaData[];
  onSelect:      (area: AreaData) => void;
  potentialAreas?: { id: string; score: number }[];
}

export default function LifeRadarChart({ areas, onSelect, potentialAreas }: Props) {
  const ICONS: Record<string, string> = {
    career: "◈", money: "◎", health: "◇", relationships: "✦", growth: "◉",
  };

  // Background concentric pentagons
  const rings = Array.from({ length: LEVELS }, (_, i) => {
    const r = (R * (i + 1)) / LEVELS;
    return (
      <polygon
        key={i}
        points={pts(ANGLES.map(a => polar(a, r)))}
        fill="none"
        stroke="rgba(167,139,250,0.08)"
        strokeWidth="1"
      />
    );
  });

  // Axis spokes
  const axes = ANGLES.map((a, i) => {
    const [x, y] = polar(a, R);
    return <line key={i} x1={CX} y1={CY} x2={x} y2={y} stroke="rgba(167,139,250,0.1)" strokeWidth="1" />;
  });

  // Scored polygon
  const scorePts = areas.map((area, i) => polar(ANGLES[i], (R * Math.min(area.score, 100)) / 100));

  // Potential polygon (ghosted gold layer)
  const potentialPts = potentialAreas
    ? potentialAreas.map((pa, i) => polar(ANGLES[i], (R * Math.min(pa.score, 100)) / 100))
    : null;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ overflow: "visible", maxWidth: W }}
    >
      <defs>
        <radialGradient id="rfill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(167,139,250,0.3)" />
          <stop offset="100%" stopColor="rgba(124,58,237,0.06)" />
        </radialGradient>
        <radialGradient id="pfill" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(251,191,36,0.18)" />
          <stop offset="100%" stopColor="rgba(251,191,36,0.03)" />
        </radialGradient>
      </defs>

      {rings}
      {axes}

      {/* Potential area (behind current scores) */}
      {potentialPts && (
        <polygon
          points={pts(potentialPts)}
          fill="url(#pfill)"
          stroke="rgba(251,191,36,0.45)"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          strokeLinejoin="round"
        />
      )}

      {/* Filled scored area */}
      <polygon
        points={pts(scorePts)}
        fill="url(#rfill)"
        stroke="rgba(167,139,250,0.65)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Score dots on each axis */}
      {areas.map((area, i) => {
        const [x, y] = scorePts[i];
        return (
          <circle
            key={area.id}
            cx={x} cy={y} r={4.5}
            fill={scoreColor(area.score)}
            stroke="rgba(7,4,14,0.85)"
            strokeWidth="1.5"
          />
        );
      })}

      {/* Labels — positioned well outside the radar */}
      {areas.map((area, i) => {
        const angle = ANGLES[i];
        const LPAD  = 22; // label distance beyond radius
        const [lx, ly] = polar(angle, R + LPAD);
        const icon  = ICONS[area.id] ?? "◇";
        const col   = scoreColor(area.score);

        // Text anchor based on which side the label is on
        const anchor: "middle" | "start" | "end" =
          angle === 0 || angle === 180 ? "middle" :
          angle < 180 ? "start" : "end";

        // Vertical nudge: top label goes up, bottom labels go down
        const baseY =
          angle < 20                 ? ly - 10 :   // career — above
          angle > 340                ? ly - 10 :
          angle > 130 && angle < 230 ? ly + 2  :   // health & growth — below
          ly - 2;                                    // sides — centre-aligned

        return (
          <g
            key={area.id}
            onClick={() => onSelect(area)}
            style={{ cursor: "pointer" }}
          >
            {/* invisible tap area */}
            <circle cx={lx} cy={baseY} r={22} fill="transparent" />

            {/* Icon + label */}
            <text
              x={lx}
              y={baseY}
              textAnchor={anchor}
              fontSize="9"
              fontFamily="var(--font-space-grotesk), sans-serif"
              fontWeight="700"
              letterSpacing="0.1"
              fill={col}
            >
              {icon} {area.label.toUpperCase()}
            </text>

            {/* Score */}
            <text
              x={lx}
              y={baseY + 13}
              textAnchor={anchor}
              fontSize="12"
              fontFamily="var(--font-space-grotesk), sans-serif"
              fontWeight="800"
              fill={col}
            >
              {area.score}
            </text>
          </g>
        );
      })}

      {/* Centre dot */}
      <circle cx={CX} cy={CY} r={2.5} fill="rgba(167,139,250,0.4)" />
    </svg>
  );
}
