"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/ask",  label: "Oracle", symbol: "✦" },
  { href: "/you",  label: "You",    symbol: "◇" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 100,
        background: "rgba(15,8,32,0.82)",
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        borderRadius: "999px",
        border: "1px solid rgba(167,139,250,0.14)",
        display: "flex",
        alignItems: "center",
        padding: "6px 8px",
        gap: "4px",
        boxShadow: "0 8px 48px rgba(0,0,0,0.7), 0 0 32px rgba(124,58,237,0.08)",
        minWidth: "200px",
        justifyContent: "space-around",
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
              gap: "4px",
              textDecoration: "none",
              padding: "8px 32px",
              borderRadius: "999px",
              background: active ? "rgba(124,58,237,0.18)" : "transparent",
              transition: "background 200ms ease",
              minWidth: "88px",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                color: active ? "#a78bfa" : "#494847",
                filter: active ? "drop-shadow(0 0 8px rgba(167,139,250,0.8))" : "none",
                transition: "color 200ms ease, filter 200ms ease",
                lineHeight: 1,
              }}
            >
              {item.symbol}
            </span>
            <span
              style={{
                fontFamily: "var(--font-space-grotesk), sans-serif",
                fontSize: "9px",
                fontWeight: active ? 600 : 500,
                letterSpacing: "0.14em",
                color: active ? "#c4b5fd" : "#5c4a7a",
                textTransform: "uppercase",
                transition: "color 200ms ease",
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
