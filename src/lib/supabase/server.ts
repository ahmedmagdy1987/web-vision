import "server-only";

/**
 * Server Supabase client bound to the request cookies (RLS runs as the signed-in
 * user). Use in Server Components, Route Handlers and Server Actions. Writes to
 * cookies are best-effort: when called from a Server Component the middleware is
 * responsible for refreshing the session cookie instead.
 */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { requirePublicSupabaseEnv } from "./env";

export async function getServerSupabase() {
  const cookieStore = await cookies();
  const { url, anonKey } = requirePublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component without a mutable cookie store —
          // safe to ignore; updateSession() in middleware refreshes cookies.
        }
      },
    },
  });
}
