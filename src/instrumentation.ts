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
  if (ok) {
    console.info(`[web-vision] ${message}`);
    return;
  }
  console.warn(`[web-vision] ${message}`);
  // Fail CLOSED in production: refuse to boot in Supabase mode without the
  // required public env, rather than silently serving the unauthenticated demo
  // backend. (Set NEXT_PUBLIC_DATA_BACKEND=local to run the demo intentionally.)
  if (process.env.NODE_ENV === "production" && backend !== "local") {
    throw new Error(
      "[web-vision] Supabase env missing in production — refusing to start to avoid serving the demo backend.",
    );
  }
}
