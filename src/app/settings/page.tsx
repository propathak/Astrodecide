"use client";

import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";

interface QuotaInfo {
  freeQuestionsUsed: number;
  paymentStatus: string;
  passExpiresAt: string | null;
}

interface ProfileCookie {
  name?: string;
  dob?: string;
  tob?: string;
  pob?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────
function readProfileCookie(): ProfileCookie {
  if (typeof document === "undefined") return {};
  const match = document.cookie.match(/(?:^|;\s*)astro_profile=([^;]*)/);
  if (!match) return {};
  try { return JSON.parse(decodeURIComponent(match[1])); } catch { return {}; }
}

function fmt24to12(tob: string): string {
  if (!tob) return "";
  const [hStr, mStr] = tob.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr ?? "00";
  const period = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${period}`;
}

function fmtDob(dob: string): string {
  // stored as DD/MM/YYYY
  if (!dob) return "";
  const [d, m, y] = dob.split("/");
  if (!d || !m || !y) return dob;
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ── city search (inline, reused from onboarding) ───────────────────────────────
interface CityResult { label: string; value: string; }

function CitySearchInline({
  initial,
  onSelect,
}: {
  initial: string;
  onSelect: (city: string) => void;
}) {
  const [query, setQuery] = useState(initial);
  const [results, setResults] = useState<CityResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(initial || null as string | null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=10&featuretype=settlement`,
        { headers: { "User-Agent": "AstroDecide/1.0", "Accept-Language": "en" } }
      );
      const data: Array<{
        name: string;
        address: { city?: string; town?: string; village?: string; county?: string; state?: string; country?: string };
      }> = await res.json();
      const LARGE = new Set(["United States","India","Australia","Canada","Brazil","Russia","China"]);
      const mapped: CityResult[] = data.map((r) => {
        const a = r.address;
        const city = a.city || a.town || a.village || a.county || r.name;
        const country = a.country ?? "";
        const state = a.state ?? "";
        const label = state && LARGE.has(country) ? `${city}, ${state}, ${country}` : `${city}, ${country}`;
        return { label, value: `${city}, ${country}` };
      }).filter((r, i, arr) => r.value && arr.findIndex(x => x.value === r.value) === i);
      setResults(mapped.slice(0, 10));
    } catch { setResults([]); }
    finally { setLoading(false); }
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center",
        background: "rgba(20,10,45,0.5)",
        border: "1px solid rgba(167,139,250,0.14)",
        borderRadius: results.length ? "12px 12px 0 0" : "12px",
        padding: "4px 4px 4px 14px", gap: "8px",
      }}>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => search(e.target.value), 380);
          }}
          placeholder="Search city…"
          autoComplete="off"
          style={{
            flex: 1, background: "transparent", border: "none",
            padding: "10px 0", color: "#fff",
            fontFamily: "var(--font-space-grotesk), sans-serif",
            fontSize: "14px",
          }}
        />
        {loading && (
          <div style={{
            width: "14px", height: "14px", borderRadius: "50%",
            border: "2px solid rgba(167,139,250,0.2)",
            borderTop: "2px solid #a78bfa",
            animation: "cosmosRotate 0.8s linear infinite",
            flexShrink: 0, marginRight: "6px",
          }} />
        )}
        {selected && (
          <button
            onClick={() => onSelect(selected)}
            style={{
              padding: "7px 14px", borderRadius: "8px",
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              border: "none", color: "#fff",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "11px", fontWeight: 700, cursor: "pointer", flexShrink: 0,
            }}
          >
            ✓
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div style={{
          background: "rgba(14,7,32,0.98)",
          border: "1px solid rgba(167,139,250,0.1)",
          borderTop: "none", borderRadius: "0 0 12px 12px",
          overflow: "hidden",
        }}>
          {results.map((r, i) => (
            <div
              key={r.value}
              onClick={() => { setSelected(r.value); setQuery(r.label); setResults([]); }}
              style={{
                padding: "12px 14px", cursor: "pointer",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "13px", color: "#ede9fe",
                borderTop: i > 0 ? "1px solid rgba(167,139,250,0.06)" : "none",
                display: "flex", alignItems: "center", gap: "8px",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(124,58,237,0.1)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
            >
              <span style={{ color: "#a78bfa", fontSize: "10px" }}>◎</span>
              {r.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [profile, setProfile] = useState<ProfileCookie>({});
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDob,  setEditDob]  = useState("");   // DD/MM/YYYY
  const [editTob,  setEditTob]  = useState("");   // HH:MM (24h)
  const [editPob,  setEditPob]  = useState("");

  useEffect(() => {
    fetch("/api/quota").then((r) => r.json()).then(setQuota).catch(() => {});
    const p = readProfileCookie();
    setProfile(p);
  }, []);

  function openEdit() {
    setEditName(profile.name ?? "");
    // dob stored DD/MM/YYYY — convert to inputs: separate day/month/year
    setEditDob(profile.dob ?? "");
    setEditTob(profile.tob ?? "");
    setEditPob(profile.pob ?? "");
    setSaveError("");
    setSaveOk(false);
    setEditMode(true);
  }

  async function handleSave() {
    if (!editName.trim()) { setSaveError("Name is required."); return; }
    if (!editDob) { setSaveError("Date of birth is required."); return; }
    if (!editTob) { setSaveError("Time of birth is required."); return; }
    if (!editPob) { setSaveError("Place of birth is required."); return; }
    setSaving(true);
    setSaveError("");
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), dob: editDob, tob: editTob, pob: editPob }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save");
      }
      // Refresh local profile from new cookie
      setProfile(readProfileCookie());
      setSaveOk(true);
      setTimeout(() => { setEditMode(false); setSaveOk(false); }, 1200);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    document.cookie = "astro_profile=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/onboarding");
  }

  async function handleSignOut() {
    await signOut({ callbackUrl: "/auth/signin" });
  }

  const isPaid =
    quota?.paymentStatus === "active" &&
    quota?.passExpiresAt &&
    new Date(quota.passExpiresAt) > new Date();

  const hasProfile = !!(profile.name && profile.dob);

  // ── shared style atoms ──────────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    fontSize: "9px", fontWeight: 600,
    letterSpacing: "0.22em", textTransform: "uppercase",
    color: "#5c4a7a", marginBottom: "6px",
  };
  const inputStyle: React.CSSProperties = {
    width: "100%", background: "rgba(20,10,45,0.5)",
    border: "1px solid rgba(167,139,250,0.14)",
    borderRadius: "12px", padding: "12px 14px",
    color: "#fff",
    fontFamily: "var(--font-space-grotesk), sans-serif",
    fontSize: "14px", boxSizing: "border-box",
  };
  const sectionLabel: React.CSSProperties = {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    fontSize: "9px", fontWeight: 600,
    letterSpacing: "0.22em", textTransform: "uppercase",
    color: "#5c4a7a", marginBottom: "12px",
  };
  const valueStyle: React.CSSProperties = {
    fontFamily: "var(--font-space-grotesk), sans-serif",
    fontSize: "13px", color: "#cdc5e8",
  };

  return (
    <div style={{
      minHeight: "100dvh",
      padding: "calc(env(safe-area-inset-top, 0px) + 20px) 24px calc(96px + env(safe-area-inset-bottom))",
      maxWidth: "430px", margin: "0 auto", width: "100%",
    }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        style={{
          background: "transparent", border: "none",
          color: "#5c4a7a",
          fontFamily: "var(--font-space-grotesk), sans-serif",
          fontSize: "20px", cursor: "pointer",
          marginBottom: "28px", padding: 0, lineHeight: 1,
        }}
      >
        ←
      </button>

      <h1 style={{
        fontFamily: "var(--font-newsreader), serif",
        fontSize: "26px", fontWeight: 400,
        color: "#ede9fe", marginBottom: "32px",
        letterSpacing: "0.02em",
      }}>
        Settings
      </h1>

      {/* ── Account ── */}
      {session?.user && (
        <div style={{ marginBottom: "28px" }}>
          <p style={sectionLabel}>Account</p>
          <div style={{
            background: "rgba(20,10,45,0.4)",
            border: "1px solid rgba(167,139,250,0.08)",
            borderRadius: "16px", padding: "16px",
            display: "flex", alignItems: "center", gap: "14px",
          }}>
            {session.user.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt={session.user.name ?? ""}
                width={40} height={40}
                style={{ borderRadius: "50%", border: "1px solid rgba(167,139,250,0.2)", flexShrink: 0 }}
              />
            )}
            <div>
              <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "14px", color: "#ede9fe", marginBottom: "2px" }}>
                {session.user.name}
              </p>
              <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "12px", color: "#5c4a7a" }}>
                {session.user.email}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Access / Quota ── */}
      {quota && (
        <div style={{ marginBottom: "28px" }}>
          <p style={sectionLabel}>Access</p>
          <div style={{
            background: isPaid ? "rgba(124,58,237,0.08)" : "rgba(20,10,45,0.4)",
            border: `1px solid ${isPaid ? "rgba(167,139,250,0.22)" : "rgba(167,139,250,0.08)"}`,
            borderRadius: "16px", padding: "16px",
          }}>
            {isPaid ? (
              <>
                <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "13px", color: "#a78bfa", marginBottom: "4px" }}>
                  ✦ Unlimited pass active
                </p>
                <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "11px", color: "#5c4a7a" }}>
                  Expires {new Date(quota.passExpiresAt!).toLocaleString()}
                </p>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "13px", color: "#cdc5e8", marginBottom: "4px" }}>
                  {Math.max(0, 3 - (quota.freeQuestionsUsed ?? 0))} of 3 free questions remaining
                </p>
                <p style={{ fontFamily: "var(--font-space-grotesk), sans-serif", fontSize: "11px", color: "#5c4a7a" }}>
                  Upgrade for ₹50 / day — unlimited access
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Birth Details ── */}
      {hasProfile && !editMode && (
        <div style={{ marginBottom: "28px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Birth Details</p>
            <button
              onClick={openEdit}
              style={{
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(167,139,250,0.22)",
                borderRadius: "999px", padding: "5px 14px",
                color: "#a78bfa",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "10px", fontWeight: 600,
                letterSpacing: "0.08em", cursor: "pointer",
              }}
            >
              Edit
            </button>
          </div>
          <div style={{
            background: "rgba(20,10,45,0.4)",
            border: "1px solid rgba(167,139,250,0.08)",
            borderRadius: "16px", overflow: "hidden",
          }}>
            {[
              { label: "Name",          value: profile.name ?? "—" },
              { label: "Date of Birth", value: fmtDob(profile.dob ?? "") || "—" },
              { label: "Time of Birth", value: fmt24to12(profile.tob ?? "") || "—" },
              { label: "Place of Birth",value: profile.pob ?? "—" },
            ].map((row, i) => (
              <div key={row.label} style={{
                padding: "13px 16px",
                borderTop: i > 0 ? "1px solid rgba(167,139,250,0.06)" : "none",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
                <span style={{ ...labelStyle, marginBottom: 0 }}>{row.label}</span>
                <span style={valueStyle}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Edit Form ── */}
      {editMode && (
        <div style={{ marginBottom: "28px", animation: "slideUp 240ms ease-out" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <p style={{ ...sectionLabel, marginBottom: 0 }}>Edit Birth Details</p>
            <button
              onClick={() => setEditMode(false)}
              style={{
                background: "transparent", border: "none",
                color: "#5c4a7a",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "11px", cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {/* Name */}
            <div>
              <p style={labelStyle}>Name</p>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value.replace(/[0-9]/g, ""))}
                placeholder="Your name"
                style={inputStyle}
              />
            </div>

            {/* DOB — stored DD/MM/YYYY, use three number inputs */}
            <div>
              <p style={labelStyle}>Date of Birth (DD / MM / YYYY)</p>
              <div style={{ display: "flex", gap: "8px" }}>
                {[
                  { placeholder: "DD", maxLen: 2, part: 0 },
                  { placeholder: "MM", maxLen: 2, part: 1 },
                  { placeholder: "YYYY", maxLen: 4, part: 2 },
                ].map(({ placeholder, maxLen, part }) => {
                  const parts = (editDob || "").split("/");
                  return (
                    <input
                      key={part}
                      value={parts[part] ?? ""}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(0, maxLen);
                        const p = (editDob || "").split("/");
                        p[part] = v;
                        setEditDob(`${p[0] ?? ""}/${p[1] ?? ""}/${p[2] ?? ""}`);
                      }}
                      placeholder={placeholder}
                      inputMode="numeric"
                      style={{
                        ...inputStyle,
                        width: part === 2 ? "50%" : "25%",
                        textAlign: "center",
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* TOB — HH:MM */}
            <div>
              <p style={labelStyle}>Time of Birth (24-hour  HH : MM)</p>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <input
                  value={(editTob || "").split(":")[0] ?? ""}
                  onChange={(e) => {
                    const h = e.target.value.replace(/\D/g, "").slice(0, 2);
                    const m = (editTob || "").split(":")[1] ?? "00";
                    setEditTob(`${h}:${m}`);
                  }}
                  placeholder="HH"
                  inputMode="numeric"
                  style={{ ...inputStyle, width: "30%", textAlign: "center" }}
                />
                <span style={{ color: "#5c4a7a", fontSize: "20px", fontWeight: 300 }}>:</span>
                <input
                  value={(editTob || "").split(":")[1] ?? ""}
                  onChange={(e) => {
                    const m = e.target.value.replace(/\D/g, "").slice(0, 2);
                    const h = (editTob || "").split(":")[0] ?? "00";
                    setEditTob(`${h}:${m}`);
                  }}
                  placeholder="MM"
                  inputMode="numeric"
                  style={{ ...inputStyle, width: "30%", textAlign: "center" }}
                />
              </div>
            </div>

            {/* POB — city search */}
            <div>
              <p style={labelStyle}>Place of Birth</p>
              <CitySearchInline
                initial={editPob}
                onSelect={(city) => setEditPob(city)}
              />
            </div>
          </div>

          {saveError && (
            <p style={{
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "12px", color: "#ff716c",
              marginTop: "12px", textAlign: "center",
            }}>{saveError}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || saveOk}
            style={{
              width: "100%", marginTop: "18px", padding: "14px",
              background: saveOk
                ? "rgba(124,58,237,0.3)"
                : saving
                  ? "rgba(124,58,237,0.4)"
                  : "linear-gradient(135deg, #7c3aed, #a78bfa)",
              border: "none", borderRadius: "999px",
              color: "#fff",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "13px", fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: saving || saveOk ? "default" : "pointer",
              boxShadow: saving || saveOk ? "none" : "0 4px 20px rgba(124,58,237,0.35)",
              transition: "all 200ms ease",
            }}
          >
            {saveOk ? "✓ Saved" : saving ? "Recalculating chart…" : "Save & Recalculate"}
          </button>
        </div>
      )}

      {/* ── Danger zone ── */}
      <div style={{ marginBottom: "28px" }}>
        <p style={sectionLabel}>Account</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {hasProfile && (
            <button
              onClick={handleReset}
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "12px", padding: "13px 16px",
                color: "#5c4a7a",
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "12px", fontWeight: 500,
                letterSpacing: "0.04em", cursor: "pointer",
                textAlign: "left",
              }}
            >
              Reset birth data &amp; redo onboarding
            </button>
          )}
          <button
            onClick={handleSignOut}
            style={{
              background: "transparent",
              border: "1px solid rgba(255,100,100,0.15)",
              borderRadius: "12px", padding: "13px 16px",
              color: "#ff716c",
              fontFamily: "var(--font-space-grotesk), sans-serif",
              fontSize: "12px", fontWeight: 500,
              letterSpacing: "0.04em", cursor: "pointer",
              textAlign: "left",
            }}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
