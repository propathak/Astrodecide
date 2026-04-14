"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
  const params = useSearchParams();
  const error = params.get("error");

  const messages: Record<string, string> = {
    OAuthCallback: "There was a problem signing in with Google.",
    OAuthSignin: "Failed to start the Google sign-in flow.",
    default: "An unexpected error occurred during sign-in.",
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 24px",
        background: "#070710",
        textAlign: "center",
      }}
    >
      <p style={{ fontFamily: "var(--font-playfair), serif", fontSize: "32px", color: "#fff", marginBottom: "16px" }}>
        Something went wrong
      </p>
      <p style={{ fontFamily: "var(--font-inter), sans-serif", fontSize: "15px", color: "rgba(255,255,255,0.5)", marginBottom: "32px" }}>
        {messages[error ?? "default"] ?? messages.default}
      </p>
      <a
        href="/auth/signin"
        style={{
          padding: "14px 28px",
          background: "rgba(139,92,246,0.15)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: "12px",
          color: "#fff",
          fontFamily: "var(--font-inter), sans-serif",
          fontSize: "14px",
          textDecoration: "none",
        }}
      >
        Try again
      </a>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense>
      <ErrorContent />
    </Suspense>
  );
}
