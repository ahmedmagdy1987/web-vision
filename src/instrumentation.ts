/**
 * Next.js startup hook. Validates the data-backend configuration once when the
 * server boots and logs a non-secret summary (or a clear warning when Supabase
 * mode is selected without the required public env).
 */
import { getDataBackend } from "@/lib/config/backend";
import { validateSupabaseEnv } from "@/lib/supabase/env";

export async function register() {
  const backend = getDataBackend();
  const { ok, message } = validateSupabaseEnv(backend);
  if (ok) console.info(`[web-vision] ${message}`);
  else console.warn(`[web-vision] ${message}`);
}
