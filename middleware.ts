import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use the minimal Edge-safe config (no Firebase) for middleware
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|api/auth).*)",
  ],
};
