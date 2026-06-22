/**
 * Send a Supabase Auth invitation using the CORRECTED onboarding redirect, so
 * the invited user lands on the password-setup flow (/auth/callback ->
 * /auth/set-password) instead of the bare sign-in form.
 *
 * This is a privileged server/admin operation (service-role). It is NOT run
 * automatically and sends a real email — invoke deliberately:
 *     node --env-file=.env.local scripts/invite-user.mjs someone@example.com
 *
 * The redirect base is derived from NEXT_PUBLIC_SITE_URL (do not hardcode in
 * production). The target callback route must be in the Supabase project's
 * "Redirect URLs" allow-list. Does not print the email or any user id.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const email = process.argv[2];

if (!url || !serviceKey) {
  console.error("Missing env (run with --env-file=.env.local).");
  process.exit(1);
}
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/invite-user.mjs <email>");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const redirectTo = `${siteUrl}/auth/callback?next=${encodeURIComponent("/auth/set-password")}`;

const { data, error } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
if (error) {
  console.error("invite failed:", error.message);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      invited: true,
      userCreated: !!data?.user?.id,
      redirectConfiguredTo: "/auth/callback?next=/auth/set-password",
      note: "Add this callback URL to the Supabase project's Redirect URLs allow-list.",
    },
    null,
    2,
  ),
);
