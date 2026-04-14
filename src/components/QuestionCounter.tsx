"use client";

const FREE_QUESTION_LIMIT = 3;

interface QuestionCounterProps {
  used: number;
  isPaid: boolean;
  passExpiresAt: string | null;
  onUpgrade: () => void;
}

export default function QuestionCounter({
  used,
  isPaid,
  passExpiresAt,
  onUpgrade,
}: QuestionCounterProps) {
  if (isPaid && passExpiresAt) {
    const expiresDate = new Date(passExpiresAt);
    const hoursLeft = Math.max(
      0,
      Math.round((expiresDate.getTime() - Date.now()) / (1000 * 60 * 60))
    );

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "11px",
          color: "rgba(167,139,250,0.8)",
          letterSpacing: "0.04em",
        }}
      >
        <span style={{ color: "#a78bfa" }}>✦</span>
        Unlimited · {hoursLeft}h left
      </div>
    );
  }

  const remaining = Math.max(0, FREE_QUESTION_LIMIT - used);
  const dots = Array.from({ length: FREE_QUESTION_LIMIT }, (_, i) => i < used);

  if (remaining === 0) {
    return (
      <button
        onClick={onUpgrade}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "rgba(139,92,246,0.12)",
          border: "1px solid rgba(139,92,246,0.25)",
          borderRadius: "20px",
          padding: "5px 12px",
          color: "#a78bfa",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "11px",
          cursor: "pointer",
          letterSpacing: "0.04em",
        }}
      >
        ✦ Upgrade ₹50/day
      </button>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontFamily: "var(--font-inter), sans-serif",
        fontSize: "11px",
        color: "rgba(255,255,255,0.35)",
        letterSpacing: "0.04em",
      }}
    >
      <span style={{ display: "flex", gap: "3px" }}>
        {dots.map((used, i) => (
          <span
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: used ? "rgba(255,255,255,0.25)" : "rgba(167,139,250,0.7)",
            }}
          />
        ))}
      </span>
      {remaining} free {remaining === 1 ? "question" : "questions"} left
    </div>
  );
}
