"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type Field = "name" | "dob" | "tob" | "pob" | "submitting";

interface ChatMessage {
  id: string;
  role: "alia" | "user";
  content: string;
}

const INTRO_SEQUENCE = [
  { content: "Hi — I'm ALIA.", delay: 700 },
  { content: "I read birth charts the way a good friend reads a room — honestly, and without judgment.", delay: 1600 },
  { content: "People come to me at crossroads. Big decisions. Quiet doubts. Moments where logic isn't enough.", delay: 3200 },
  { content: "Before I can see your stars, I need to know a few things about you.", delay: 5200 },
];

// ── Data ───────────────────────────────────────────────────────────────────────
const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1).padStart(2, "0"),
  label: String(i + 1).padStart(2, "0"),
}));
const MONTHS = [
  { value: "01", label: "Jan" }, { value: "02", label: "Feb" },
  { value: "03", label: "Mar" }, { value: "04", label: "Apr" },
  { value: "05", label: "May" }, { value: "06", label: "Jun" },
  { value: "07", label: "Jul" }, { value: "08", label: "Aug" },
  { value: "09", label: "Sep" }, { value: "10", label: "Oct" },
  { value: "11", label: "Nov" }, { value: "12", label: "Dec" },
];
const YEARS = Array.from({ length: 86 }, (_, i) => {
  const y = 1930 + i;
  return { value: String(y), label: String(y) };
});
const HOURS_12 = Array.from({ length: 12 }, (_, i) => {
  const h = i + 1; // 1–12
  return { value: String(h), label: String(h) };
});
const MINUTES = Array.from({ length: 60 }, (_, i) => ({
  value: String(i).padStart(2, "0"),
  label: String(i).padStart(2, "0"),
}));
const AMPM = [{ value: "AM", label: "AM" }, { value: "PM", label: "PM" }];

// ── WheelColumn ────────────────────────────────────────────────────────────────
const ITEM_H = 48;
const VISIBLE = 5;
const CONTAINER_H = ITEM_H * VISIBLE;

function WheelColumn({
  items,
  selectedIndex,
  onSelect,
  label,
  width,
}: {
  items: { value: string; label: string }[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  label?: string;
  width?: string | number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const snapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const settling = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const target = selectedIndex * ITEM_H;
    if (Math.abs(el.scrollTop - target) > 4) {
      settling.current = true;
      el.scrollTo({ top: target, behavior: "smooth" });
      const t = setTimeout(() => { settling.current = false; }, 500);
      return () => clearTimeout(t);
    }
  }, [selectedIndex]);

  function handleScroll() {
    if (settling.current) return;
    clearTimeout(snapTimer.current);
    snapTimer.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM_H)));
      settling.current = true;
      el.scrollTo({ top: idx * ITEM_H, behavior: "smooth" });
      setTimeout(() => { settling.current = false; }, 500);
      onSelect(idx);
    }, 100);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width }}>
      {label && (
        <span style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "9px", fontWeight: 600,
          letterSpacing: "0.24em", color: "#a78bfa",
          textTransform: "uppercase", marginBottom: "10px",
        }}>
          {label}
        </span>
      )}
      <div style={{ position: "relative", height: CONTAINER_H, width: "100%" }}>
        {/* Selection highlight */}
        <div style={{
          position: "absolute", top: ITEM_H * 2, left: "4px", right: "4px",
          height: ITEM_H,
          background: "rgba(167,139,250,0.07)",
          border: "1px solid rgba(167,139,250,0.16)",
          borderRadius: "12px", pointerEvents: "none", zIndex: 2,
        }} />
        {/* Top fade */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: "38%",
          background: "linear-gradient(to bottom, rgba(7,4,14,0.98) 0%, transparent 100%)",
          pointerEvents: "none", zIndex: 3,
        }} />
        {/* Bottom fade */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: "38%",
          background: "linear-gradient(to top, rgba(7,4,14,0.98) 0%, transparent 100%)",
          pointerEvents: "none", zIndex: 3,
        }} />
        {/* Scroll list */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            height: "100%", overflowY: "scroll",
            scrollbarWidth: "none",
            paddingTop: `${ITEM_H * 2}px`,
            paddingBottom: `${ITEM_H * 2}px`,
          }}
        >
          {items.map((item, i) => {
            const sel = i === selectedIndex;
            return (
              <div
                key={item.value}
                onClick={() => {
                  onSelect(i);
                  const el = scrollRef.current;
                  if (el) {
                    settling.current = true;
                    el.scrollTo({ top: i * ITEM_H, behavior: "smooth" });
                    setTimeout(() => { settling.current = false; }, 500);
                  }
                }}
                style={{
                  height: ITEM_H,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer",
                  fontFamily: "var(--font-manrope), sans-serif",
                  fontSize: sel ? "20px" : "15px",
                  fontWeight: sel ? 600 : 400,
                  color: sel ? "#ffffff" : "#494847",
                  transition: "font-size 120ms ease, color 120ms ease",
                  userSelect: "none",
                  letterSpacing: "0.02em",
                }}
              >
                {item.label}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── DatePicker ─────────────────────────────────────────────────────────────────
function DatePicker({ onConfirm }: { onConfirm: (dob: string) => void }) {
  const defaultYear = new Date().getFullYear() - 25;
  const [dayIdx, setDayIdx] = useState(0);
  const [monIdx, setMonIdx] = useState(0);
  const [yearIdx, setYearIdx] = useState(YEARS.findIndex(y => y.value === String(defaultYear)));

  const formatted = `${DAYS[dayIdx].value}/${MONTHS[monIdx].value}/${YEARS[yearIdx].value}`;
  const displayStr = `${DAYS[dayIdx].label} ${MONTHS[monIdx].label} ${YEARS[yearIdx].value}`;

  return (
    <div style={{ animation: "slideUp 280ms ease-out" }}>
      <div
        style={{
          background: "rgba(12,6,28,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "24px 20px 20px",
          marginBottom: "12px",
        }}
      >
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.2em", color: "#adaaaa",
          textTransform: "uppercase", marginBottom: "20px",
          textAlign: "center",
        }}>
          Date of Birth
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          <WheelColumn items={DAYS}   selectedIndex={dayIdx}  onSelect={setDayIdx}  label="Day"   width="72px" />
          <WheelColumn items={MONTHS} selectedIndex={monIdx}  onSelect={setMonIdx}  label="Month" width="72px" />
          <WheelColumn items={YEARS}  selectedIndex={yearIdx} onSelect={setYearIdx} label="Year"  width="90px" />
        </div>
      </div>
      <button
        onClick={() => onConfirm(formatted)}
        style={{
          width: "100%", padding: "14px",
          background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
          border: "none", borderRadius: "999px",
          color: "#ffffff",
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "13px", fontWeight: 600,
          letterSpacing: "0.08em",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(167,139,250,0.28)",
          transition: "box-shadow 180ms ease",
        }}
      >
        {displayStr} — Confirm
      </button>
    </div>
  );
}

// ── TimePicker ─────────────────────────────────────────────────────────────────
function TimePicker({ onConfirm }: { onConfirm: (tob: string) => void }) {
  const [hrIdx,   setHrIdx]   = useState(6);  // default 7 AM
  const [minIdx,  setMinIdx]  = useState(0);
  const [ampmIdx, setAmpmIdx] = useState(0);  // 0 = AM

  const hr12  = HOURS_12[hrIdx].value;        // "1"–"12"
  const min   = MINUTES[minIdx].value;        // "00"–"59"
  const ampm  = AMPM[ampmIdx].value;          // "AM" | "PM"

  // Convert to 24-hour for the API
  function to24(h: string, period: string) {
    let n = parseInt(h, 10);
    if (period === "AM" && n === 12) n = 0;
    if (period === "PM" && n !== 12) n += 12;
    return String(n).padStart(2, "0");
  }

  const display24 = `${to24(hr12, ampm)}:${min}`;
  const displayLabel = `${hr12}:${min} ${ampm}`;

  return (
    <div style={{ animation: "slideUp 280ms ease-out" }}>
      <div
        style={{
          background: "rgba(12,6,28,0.88)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.05)",
          padding: "24px 20px 20px",
          marginBottom: "12px",
        }}
      >
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 500,
          letterSpacing: "0.2em", color: "#adaaaa",
          textTransform: "uppercase", marginBottom: "20px",
          textAlign: "center",
        }}>
          Time of Birth
        </p>
        <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "flex-start" }}>
          <WheelColumn items={HOURS_12} selectedIndex={hrIdx}   onSelect={setHrIdx}   label="Hour"   width="72px" />
          <div style={{ paddingTop: `${10 + ITEM_H * 2 + ITEM_H / 2 - 12}px`, color: "#adaaaa", fontSize: "22px", fontWeight: 300 }}>:</div>
          <WheelColumn items={MINUTES}  selectedIndex={minIdx}  onSelect={setMinIdx}  label="Minute" width="72px" />
          <WheelColumn items={AMPM}     selectedIndex={ampmIdx} onSelect={setAmpmIdx} label="AM/PM"  width="68px" />
        </div>
        <p style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "11px", color: "#494847",
          textAlign: "center", marginTop: "12px",
        }}>
          Not sure? Your best guess works.
        </p>
      </div>
      <button
        onClick={() => onConfirm(display24)}
        style={{
          width: "100%", padding: "14px",
          background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
          border: "none", borderRadius: "999px",
          color: "#ffffff",
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "13px", fontWeight: 600,
          letterSpacing: "0.08em",
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(167,139,250,0.28)",
        }}
      >
        {displayLabel} — Confirm
      </button>
    </div>
  );
}

// ── CitySearch ─────────────────────────────────────────────────────────────────
interface CityResult {
  label: string;
  value: string; // "City, Country"
}

function CitySearch({ onConfirm }: { onConfirm: (city: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=7&featuretype=settlement`,
        {
          headers: {
            "User-Agent": "AstroDecide/1.0 (astrodecide.vercel.app)",
            "Accept-Language": "en",
          },
        }
      );
      const data: Array<{
        name: string;
        type: string;
        address: {
          city?: string; town?: string; village?: string; county?: string;
          state?: string; country?: string; country_code?: string;
        };
      }> = await res.json();

      const LARGE_COUNTRIES = new Set(["United States", "India", "Australia", "Canada", "Brazil", "Russia", "China"]);

      const mapped: CityResult[] = data
        .map((r) => {
          const a = r.address;
          const city = a.city || a.town || a.village || a.county || r.name;
          const country = a.country ?? "";
          const state = a.state ?? "";
          const label = state && LARGE_COUNTRIES.has(country)
            ? `${city}, ${state}, ${country}`
            : `${city}, ${country}`;
          return { label, value: `${city}, ${country}` };
        })
        .filter((r, i, arr) => r.value && arr.findIndex(x => x.value === r.value) === i);

      setResults(mapped.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    setSelected(null);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 420);
  }

  function pick(result: CityResult) {
    setSelected(result.value);
    setQuery(result.label);
    setResults([]);
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div style={{ animation: "slideUp 280ms ease-out" }}>
      {/* Input */}
      <div
        style={{
          display: "flex", alignItems: "center",
          background: "rgba(38,38,38,0.5)",
          backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
          borderRadius: selected ? "16px" : results.length ? "16px 16px 0 0" : "16px",
          border: "1px solid rgba(255,255,255,0.07)",
          borderBottom: results.length > 0 ? "1px solid rgba(255,255,255,0.04)" : undefined,
          padding: "4px 4px 4px 18px",
          transition: "border-color 200ms ease",
          gap: "8px",
        }}
      >
        <span style={{ color: "#adaaaa", fontSize: "14px", flexShrink: 0 }}>🔍</span>
        <input
          ref={inputRef}
          value={query}
          onChange={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Enter" && selected) onConfirm(selected);
          }}
          placeholder="Search city..."
          autoComplete="off"
          style={{
            flex: 1, background: "transparent", border: "none",
            padding: "13px 0", fontSize: "16px",
            color: "#fff",
            fontFamily: "var(--font-manrope), sans-serif",
            fontWeight: 300,
          }}
        />
        {loading && (
          <div style={{
            width: "16px", height: "16px", borderRadius: "50%",
            border: "2px solid rgba(167,139,250,0.2)",
            borderTop: "2px solid #a78bfa",
            animation: "cosmosRotate 0.8s linear infinite",
            flexShrink: 0, marginRight: "8px",
          }} />
        )}
      </div>

      {/* Dropdown */}
      {results.length > 0 && (
        <div style={{
          background: "rgba(26,25,25,0.98)",
          backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.07)",
          borderTop: "none",
          borderRadius: "0 0 16px 16px",
          overflow: "hidden",
          marginBottom: "12px",
        }}>
          {results.map((r, i) => (
            <div
              key={r.value}
              onClick={() => pick(r)}
              style={{
                padding: "14px 18px",
                cursor: "pointer",
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "14px", fontWeight: 400,
                color: "#ffffff",
                borderTop: i > 0 ? "1px solid rgba(255,255,255,0.04)" : "none",
                transition: "background 150ms ease",
                display: "flex", alignItems: "center", gap: "10px",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(167,139,250,0.07)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <span style={{ color: "#a78bfa", fontSize: "12px", flexShrink: 0 }}>◎</span>
              {r.label}
            </div>
          ))}
        </div>
      )}

      {/* Confirm button when city selected */}
      {selected && (
        <button
          onClick={() => onConfirm(selected)}
          style={{
            width: "100%", padding: "14px",
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            border: "none", borderRadius: "999px",
            color: "#ffffff",
            fontFamily: "var(--font-manrope), sans-serif",
            fontSize: "13px", fontWeight: 600,
            letterSpacing: "0.08em", cursor: "pointer",
            boxShadow: "0 4px 20px rgba(167,139,250,0.28)",
            animation: "slideUp 200ms ease-out",
            marginTop: results.length > 0 ? "0" : "12px",
          }}
        >
          {selected} — Confirm
        </button>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [currentField, setCurrentField] = useState<Field | null>(null);
  const [typing, setTyping] = useState(false);
  const [data, setData] = useState({ name: "", dob: "", tob: "", pob: "" });
  const [error, setError] = useState("");
  const [editingField, setEditingField] = useState<Field | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    setTyping(true);

    INTRO_SEQUENCE.forEach(({ content, delay }, i) => {
      timers.push(
        setTimeout(() => {
          setMessages((prev) => [...prev, { id: `intro-${i}`, role: "alia", content }]);
          if (i === INTRO_SEQUENCE.length - 1) {
            timers.push(setTimeout(() => {
              setMessages((prev) => [...prev, { id: "q-name", role: "alia", content: "What do I call you?" }]);
              setCurrentField("name");
              setTyping(false);
            }, 900));
          }
        }, delay)
      );
    });

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    if (currentField === "name" && !typing) inputRef.current?.focus();
  }, [messages, typing, currentField]);

  // Handle text fields (only "name")
  async function handleTextSend() {
    if (!input.trim() || !currentField || typing) return;
    if (currentField !== "name") return;
    if (!input.trim()) { setError("Please enter your name."); return; }
    setError("");

    const value = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: value }]);
    const newData = { ...data, name: value };
    setData(newData);
    setTyping(true);

    setTimeout(() => {
      setMessages((prev) => [...prev, {
        id: "a-name", role: "alia",
        content: `${value}. ✦\n\nThe stars remember the exact moment you arrived. When were you born?`,
      }]);
      setCurrentField("dob");
      setTyping(false);
    }, 820);
  }

  // Handle wheel/autocomplete confirmations
  function handleFieldConfirm(field: "dob" | "tob" | "pob", value: string) {
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", content: value }]);
    const newData = { ...data, [field]: value };
    setData(newData);
    setTyping(true);

    if (field === "dob") {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: "a-dob", role: "alia",
          content: "Good. The time matters too — even an hour shifts your rising sign. What time were you born?\n\nA rough guess is fine if you're not sure.",
        }]);
        setCurrentField("tob");
        setTyping(false);
      }, 820);
    } else if (field === "tob") {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: "a-tob", role: "alia",
          content: "Almost there. Where in the world did you take your first breath?",
        }]);
        setCurrentField("pob");
        setTyping(false);
      }, 820);
    } else if (field === "pob") {
      setTimeout(() => {
        setMessages((prev) => [...prev, {
          id: "mapping", role: "alia",
          content: `I'm mapping your chart now, ${newData.name}. Give me a moment...`,
        }]);
        setCurrentField("submitting");
        setTyping(false);
        handleSubmit(newData);
      }, 650);
    }
  }

  async function handleSubmit(submitData: typeof data) {
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });
      if (!res.ok) throw new Error("Failed");

      // Chart is ready — show a teaser cliffhanger before entering the oracle
      setTyping(true);
      await new Promise((r) => setTimeout(r, 1800));
      setMessages((prev) => [...prev, {
        id: "cliffhanger-1", role: "alia",
        content: `Your chart is ready, ${submitData.name}. ✦`,
      }]);
      await new Promise((r) => setTimeout(r, 1400));
      setMessages((prev) => [...prev, {
        id: "cliffhanger-2", role: "alia",
        content: "There's something in here I don't see very often. Something about the next few months that I think you need to hear.",
      }]);
      await new Promise((r) => setTimeout(r, 1800));
      setMessages((prev) => [...prev, {
        id: "cliffhanger-3", role: "alia",
        content: "Ask me anything and I'll start there.",
      }]);
      setTyping(false);
      await new Promise((r) => setTimeout(r, 1200));
      router.push("/ask");
    } catch {
      setTyping(false);
      setMessages((prev) => [
        ...prev,
        { id: "err", role: "alia", content: "Something went wrong mapping your chart. Where were you born again?" },
      ]);
      setCurrentField("pob");
    }
  }

  const showNameInput = currentField === "name" && !typing;
  const showDatePicker = currentField === "dob" && !typing;
  const showTimePicker = currentField === "tob" && !typing;
  const showCitySearch = currentField === "pob" && !typing;

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", maxWidth: "430px", margin: "0 auto", width: "100%" }}>
      {/* Header */}
      <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 16px) 24px 16px", flexShrink: 0, display: "flex", alignItems: "center", gap: "10px" }}>
        <div className="alia-dot" />
        <span style={{
          fontFamily: "var(--font-manrope), sans-serif",
          fontSize: "10px", fontWeight: 600,
          letterSpacing: "0.28em", color: "#a78bfa", textTransform: "uppercase",
        }}>
          ALIA
        </span>
      </div>

      {/* Messages — extra bottom padding so content clears the fixed input bar */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 24px 260px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {messages.map((msg) => {
          // Map user message ids to editable fields
          const editableMap: Record<string, Field> = {
            "a-name": "name",
            "a-dob": "dob",
            "a-tob": "tob",
          };
          // User bubbles that can be edited: find the user bubble BEFORE an alia response
          const prevAliaId = msg.id.startsWith("u-") ? messages[messages.indexOf(msg) - 1]?.id : null;
          const editableFor = prevAliaId ? editableMap[prevAliaId] : null;
          const canEdit = editableFor && currentField !== "submitting" && !typing;

          return (
            <div key={msg.id} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              flexDirection: "column",
              alignItems: msg.role === "user" ? "flex-end" : "flex-start",
              animation: "slideUp 260ms ease-out",
            }}>
              {msg.role === "alia" ? (
                <p style={{
                  fontFamily: "var(--font-newsreader), serif",
                  fontSize: "19px", fontWeight: 400,
                  lineHeight: 1.7, color: "#ede9fe",
                  maxWidth: "92%", whiteSpace: "pre-wrap",
                  letterSpacing: "0.01em",
                }}>
                  {msg.content}
                </p>
              ) : (
                <>
                  <div style={{
                    background: "rgba(38,38,38,0.5)",
                    backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                    border: "1px solid rgba(167,139,250,0.12)",
                    borderRadius: "20px 20px 5px 20px",
                    padding: "12px 18px",
                    fontFamily: "var(--font-manrope), sans-serif",
                    fontSize: "15px", fontWeight: 400,
                    color: "#ede9fe", maxWidth: "78%", lineHeight: 1.55,
                  }}>
                    {msg.content}
                  </div>
                  {canEdit && (
                    <button
                      onClick={() => {
                        setEditingField(editableFor!);
                        setCurrentField(editableFor!);
                      }}
                      style={{
                        marginTop: "4px",
                        background: "transparent", border: "none",
                        color: "#5c4a7a",
                        fontFamily: "var(--font-space-grotesk), sans-serif",
                        fontSize: "10px", letterSpacing: "0.08em",
                        cursor: "pointer", padding: "2px 4px",
                      }}
                    >
                      ✏ edit
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}

        {/* Typing dots */}
        {typing && (
          <div style={{ display: "flex", gap: "5px", alignItems: "center", padding: "6px 0", animation: "fadeIn 200ms ease-out" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
        )}

        {/* Mapping state */}
        {currentField === "submitting" && !typing && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingTop: "4px" }}>
            {[0, 1, 2].map((i) => (
              <span key={i} className="typing-dot" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
            <span style={{
              fontFamily: "var(--font-manrope), sans-serif",
              fontSize: "10px", letterSpacing: "0.24em",
              color: "#a78bfa", fontWeight: 500, textTransform: "uppercase",
            }}>
              Mapping Stars
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input Area — fixed to bottom so keyboard never hides it ── */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: "430px",
        padding: "14px 20px calc(20px + env(safe-area-inset-bottom))",
        background: "rgba(8,4,20,0.96)",
        backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)",
        borderTop: "1px solid rgba(167,139,250,0.08)",
        zIndex: 50,
      }}>
        {/* Name text input */}
        {showNameInput && (
          <div style={{ animation: "slideUp 220ms ease-out" }}>
            {error && (
              <p style={{
                fontFamily: "var(--font-manrope), sans-serif",
                fontSize: "11px", color: "#ff716c",
                marginBottom: "10px", letterSpacing: "0.04em",
              }}>
                {error}
              </p>
            )}
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <div style={{
                flex: 1,
                background: "rgba(38,38,38,0.5)",
                backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
                borderRadius: "999px",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex", alignItems: "center",
                padding: "0 4px 0 20px",
                transition: "border-color 200ms ease",
              }}
              onFocusCapture={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(167,139,250,0.3)")}
              onBlurCapture={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,0.08)")}
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value.replace(/[0-9]/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleTextSend()}
                  placeholder="Your name..."
                  autoComplete="off"
                  inputMode="text"
                  style={{
                    flex: 1, background: "transparent", border: "none",
                    padding: "13px 0", fontSize: "16px",
                    color: "#fff",
                    fontFamily: "var(--font-manrope), sans-serif", fontWeight: 300,
                  }}
                />
              </div>
              <button
                onClick={handleTextSend}
                style={{
                  width: "46px", height: "46px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
                  border: "none", color: "#ffffff",
                  fontSize: "18px", fontWeight: 700,
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 4px 20px rgba(167,139,250,0.28)",
                }}
              >
                →
              </button>
            </div>
          </div>
        )}

        {/* Date wheel picker */}
        {showDatePicker && (
          <DatePicker onConfirm={(val) => handleFieldConfirm("dob", val)} />
        )}

        {/* Time wheel picker */}
        {showTimePicker && (
          <TimePicker onConfirm={(val) => handleFieldConfirm("tob", val)} />
        )}

        {/* City autocomplete */}
        {showCitySearch && (
          <CitySearch onConfirm={(val) => handleFieldConfirm("pob", val)} />
        )}
      </div>
    </div>
  );
}
