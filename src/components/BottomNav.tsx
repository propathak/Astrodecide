"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/ask", label: "ALIA", symbol: "✦" },
  { href: "/chart", label: "CHART", symbol: "◎" },
  { href: "/you", label: "YOU", symbol: "◇" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: "rgba(7,7,16,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 0 calc(10px + env(safe-area-inset-bottom))",
        maxWidth: "430px",
        margin: "0 auto",
      }}
    >
      {NAV.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "5px",
              textDecoration: "none",
              padding: "4px 24px",
            }}
          >
            <span
              style={{
                fontSize: "15px",
                color: active ? "#8B5CF6" : "#3D3D52",
                filter: active ? "drop-shadow(0 0 8px rgba(139,92,246,0.75))" : "none",
                transition: "color 180ms ease, filter 180ms ease",
                lineHeight: 1,
              }}
            >
              {item.symbol}
            </span>
            <span
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "9px",
                fontWeight: 300,
                letterSpacing: "0.18em",
                color: active ? "#e8e8ff" : "#3D3D52",
                transition: "color 180ms ease",
              }}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
