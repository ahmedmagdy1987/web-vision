/**
 * Browser Supabase client (singleton). Uses the publishable/anon key only — the
 * service-role key never reaches the browser. Cookie handling is provided by
 * @supabase/ssr so the session is shared with the server client + middleware.
 * Call only from client code (it reads document cookies on first use).
 */
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";
import { requirePublicSupabaseEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let cached: BrowserClient | null = null;

export function getBrowserSupabase(): BrowserClient {
  if (cached) return cached;
  const { url, anonKey } = requirePublicSupabaseEnv();
  cached = createBrowserClient<Database>(url, anonKey);
  return cached;
}
