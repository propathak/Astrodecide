"use client";

const FREE_QUESTION_LIMIT = 1;

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
  // Paid — show hours remaining
  if (isPaid && passExpiresAt) {
    const hoursLeft = Math.max(
      0,
      Math.round((new Date(passExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60))
    );
    return (
      <div style={{
        display: "flex", alignItems: "center", gap: "6px",
        fontFamily: "var(--font-manrope), sans-serif",
        fontSize: "11px", fontWeight: 500,
        color: "rgba(167,139,250,0.75)", letterSpacing: "0.04em",
      }}>
        <span style={{ color: "#a78bfa" }}>✦</span>
        Unlimited · {hoursLeft}h left
      </div>
    );
  }

  // Out of free questions — show upgrade button
  if (used >= FREE_QUESTION_LIMIT) {
    return (
      <button
        onClick={onUpgrade}
        style={{
          display: "flex", alignItems: "center", gap: "6px",
          background: "rgba(167,139,250,0.08)",
          border: "1px solid rgba(167,139,250,0.22)",
          borderRadius: "999px", padding: "5px 14px",
          color: "#a78bfa",
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "11px", fontWeight: 500,
          cursor: "pointer", letterSpacing: "0.06em",
          transition: "background 180ms ease",
        }}
      >
        ✦ Upgrade
      </button>
    );
  }

  // Free tier, questions still available — show nothing
  return null;
}
