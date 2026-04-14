import type { Metadata, Viewport } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import AmbientBackground from "@/components/AmbientBackground";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AstroDecide",
  description: "Your cosmic guide for life's crossroads",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#070710",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${playfair.variable} ${inter.variable}`}>
      <body className="min-h-full antialiased" style={{ background: "#070710", color: "#fff" }}>
        <AmbientBackground />
        <SessionProvider>
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}
