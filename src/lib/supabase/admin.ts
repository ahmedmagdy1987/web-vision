import "server-only";

/**
 * Privileged Supabase client using the SERVICE-ROLE key. This bypasses RLS and
 * must NEVER be imported into client code — the `server-only` import above turns
 * any client import into a build error. Use sparingly for trusted server tasks
 * (e.g. orphaned-object cleanup, admin bootstrap, seeding).
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { requirePublicSupabaseEnv, requireServiceRoleKey } from "./env";

export function getAdminSupabase() {
  const { url } = requirePublicSupabaseEnv();
  const serviceKey = requireServiceRoleKey();
  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
