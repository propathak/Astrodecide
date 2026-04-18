"use client";

interface StructuredData {
  confidenceScore: number;
  bestTimeWindows: string[];
  do: string[];
  avoid: string[];
  wait: string[];
}

interface StructuredAnswerProps {
  data: StructuredData;
}

function ConfidenceMeter({ score }: { score: number }) {
  const level =
    score >= 70
      ? { label: "Proceed", color: "#34d399" }
      : score >= 40
      ? { label: "Caution", color: "#fbbf24" }
      : { label: "Wait", color: "#f87171" };

  return (
    <div style={{ marginBottom: "18px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#777575",
            fontWeight: 500,
          }}
        >
          Confidence
        </span>
        <span
          style={{
            fontFamily: "var(--font-newsreader), serif",
            fontSize: "15px",
            fontWeight: 400,
            color: level.color,
          }}
        >
          {score}% · {level.label}
        </span>
      </div>
      <div
        style={{
          height: "3px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${score}%`,
            background: level.color,
            borderRadius: "2px",
            transition: "width 700ms ease-out",
            boxShadow: `0 0 8px ${level.color}60`,
          }}
        />
      </div>
    </div>
  );
}

function ListSection({
  title,
  items,
  color,
  icon,
}: {
  title: string;
  items: string[];
  color: string;
  icon: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div style={{ marginBottom: "14px" }}>
      <p
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          color: "#777575",
          marginBottom: "8px",
          fontWeight: 500,
        }}
      >
        {icon} {title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "13px",
              fontWeight: 300,
              color: "rgba(255,255,255,0.72)",
              lineHeight: 1.55,
            }}
          >
            <span style={{ color, marginTop: "2px", flexShrink: 0, fontSize: "10px" }}>
              ●
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StructuredAnswer({ data }: StructuredAnswerProps) {
  return (
    <div
      style={{
        marginTop: "18px",
        background: "rgba(38,38,38,0.35)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "20px",
        padding: "20px",
        animation: "slideUp 300ms ease-out",
      }}
    >
      <ConfidenceMeter score={data.confidenceScore} />

      {data.bestTimeWindows && data.bestTimeWindows.length > 0 && (
        <div style={{ marginBottom: "16px" }}>
          <p
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "10px",
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#777575",
              marginBottom: "8px",
              fontWeight: 500,
            }}
          >
            ◷ Best Time Windows
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {data.bestTimeWindows.map((w, i) => (
              <span
                key={i}
                style={{
                  background: "rgba(167,139,250,0.1)",
                  border: "1px solid rgba(167,139,250,0.22)",
                  borderRadius: "999px",
                  padding: "4px 12px",
                  fontFamily: "var(--font-space-grotesk), var(--font-manrope), sans-serif",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "#a78bfa",
                  letterSpacing: "0.02em",
                }}
              >
                {w}
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <ListSection title="Do" items={data.do} color="#34d399" icon="↑" />
        <ListSection title="Avoid" items={data.avoid} color="#f87171" icon="↓" />
      </div>

      {data.wait && data.wait.length > 0 && (
        <ListSection title="Wait" items={data.wait} color="#fbbf24" icon="◷" />
      )}
    </div>
  );
}
