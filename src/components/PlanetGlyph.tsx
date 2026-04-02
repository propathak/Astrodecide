// Thin-line SVG glyphs for each planet — ancient astronomical symbols
// \uFE0E forces text (monochrome) rendering instead of emoji color rendering
const GLYPHS: Record<string, string> = {
  Sun: "☉\uFE0E",
  Moon: "☽\uFE0E",
  Mercury: "☿\uFE0E",
  Venus: "♀\uFE0E",
  Mars: "♂\uFE0E",
  Jupiter: "♃\uFE0E",
  Saturn: "♄\uFE0E",
  Uranus: "♅\uFE0E",
  Neptune: "♆\uFE0E",
  Rahu: "☊\uFE0E",
  Ketu: "☋\uFE0E",
  Ascendant: "↑",
};

interface Props {
  planet: string;
  size?: number;
  color?: string;
}

export default function PlanetGlyph({ planet, size = 16, color = "#888888" }: Props) {
  const glyph = GLYPHS[planet] ?? "✦";
  return (
    <span
      style={{
        fontFamily: "serif",
        fontSize: `${size}px`,
        color,
        lineHeight: 1,
        userSelect: "none",
      }}
      aria-label={planet}
    >
      {glyph}
    </span>
  );
}
