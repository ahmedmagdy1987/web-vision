/**
 * Environment contract for the Supabase backend.
 *
 * Public values (URL + anon/publishable key) are the ONLY Supabase values that
 * may reach the browser bundle (they are `NEXT_PUBLIC_*`). The service-role key
 * is server-only and is read exclusively by src/lib/supabase/admin.ts.
 *
 * See .env.example. Missing configuration produces a clear, actionable error
 * instead of an opaque network failure.
 */

export interface PublicSupabaseEnv {
  url: string;
  anonKey: string;
}

export function getPublicSupabaseEnv(): { url?: string; anonKey?: string } {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    // Supports both the legacy anon key and the newer publishable key naming.
    anonKey:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  };
}

/** True when the public Supabase configuration is present. */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getPublicSupabaseEnv();
  return Boolean(url && anonKey);
}

const SETUP_HINT =
  "Copy .env.example to .env.local and set NEXT_PUBLIC_SUPABASE_URL and " +
  "NEXT_PUBLIC_SUPABASE_ANON_KEY, or run in demo mode with NEXT_PUBLIC_DATA_BACKEND=local.";

/** Public env or a descriptive error (safe to call in the browser). */
export function requirePublicSupabaseEnv(): PublicSupabaseEnv {
  const { url, anonKey } = getPublicSupabaseEnv();
  if (!url || !anonKey) {
    throw new Error(`[web-vision] Supabase is not configured. ${SETUP_HINT}`);
  }
  return { url, anonKey };
}

/** Service-role key (server-only). Never import this into client code. */
export function requireServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "[web-vision] Missing SUPABASE_SERVICE_ROLE_KEY (server-only). Set it in .env.local for privileged server operations.",
    );
  }
  return key;
}

/**
 * Validate configuration at startup. In Supabase mode the public env must be
 * present; in demo mode nothing is required. Returns a human-readable summary
 * for logging — never returns secret values.
 */
export function validateSupabaseEnv(mode: "local" | "supabase"): { ok: boolean; message: string } {
  if (mode === "local") {
    return { ok: true, message: "Data backend: local demo (localStorage). Supabase not required." };
  }
  const { url, anonKey } = getPublicSupabaseEnv();
  if (!url || !anonKey) {
    return { ok: false, message: `Data backend: supabase, but public env is missing. ${SETUP_HINT}` };
  }
  return { ok: true, message: `Data backend: supabase (${new URL(url).host}).` };
}
