import type { Metadata, Viewport } from "next";
import { Newsreader, Manrope, Space_Grotesk } from "next/font/google";
import AmbientBackground from "@/components/AmbientBackground";
import SessionProvider from "@/components/SessionProvider";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-space-grotesk",
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
  themeColor: "#0e0e0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full ${newsreader.variable} ${manrope.variable} ${spaceGrotesk.variable}`}>
      <body className="min-h-full antialiased" style={{ background: "#0e0e0e", color: "#fff" }}>
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
