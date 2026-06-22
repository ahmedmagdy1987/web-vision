import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { safeNextPath } from "@/lib/auth/redirect";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * Auth callback for invitations, password recovery, magic links and email
 * confirmation. Supports both the PKCE `code` flow and the `token_hash`+`type`
 * (verifyOtp) flow, and surfaces Supabase error redirects (e.g. otp_expired) as
 * a deliberate recovery state instead of the normal sign-in form.
 *
 * Invite/recovery sessions are routed to /auth/set-password so the user can
 * establish credentials. `next` is open-redirect-validated.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const next = safeNextPath(searchParams.get("next"), "/");

  const expired = (reason: string) =>
    NextResponse.redirect(`${origin}/auth/invite-expired?reason=${encodeURIComponent(reason)}`);

  // Supabase appended an error to the redirect (expired/consumed/invalid link).
  if (error || errorCode) {
    return expired(errorCode || error || "invalid");
  }

  const supabase = await getServerSupabase();

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return expired("exchange_failed");
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (verifyError) return expired("otp_invalid");
    // Invited / recovering users must set a password first.
    const destination = type === "invite" || type === "recovery" ? "/auth/set-password" : next;
    return NextResponse.redirect(`${origin}${destination}`);
  }

  return expired("missing_params");
}
