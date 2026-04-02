import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Lazy singleton — only initializes when actually called at runtime
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase environment variables are not configured.");
    }
    _client = createClient(url, key);
  }
  return _client;
}

// Server-side client with service role key (bypasses RLS)
export function createServerClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Supabase server credentials are not configured.");
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

// Named export kept for compatibility
export const supabase = {
  get client() { return getSupabaseClient(); }
};
