import "server-only";

/**
 * Session refresh + route protection for Next.js middleware.
 *
 * In demo mode (no Supabase env) this is a no-op so the localStorage backend
 * keeps working without auth. When Supabase is configured it refreshes the auth
 * cookie and redirects unauthenticated users to /sign-in (preserving the
 * intended path via ?redirect=).
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getDataBackend } from "@/lib/config/backend";
import type { Database } from "./database.types";
import { getPublicSupabaseEnv } from "./env";

// Public auth surface: the sign-in page and the whole /auth/* onboarding flow
// (callback, set-password, forgot-password, invite-expired).
const PUBLIC_PREFIXES = ["/sign-in", "/auth"];

// Public metadata/static asset routes must never be redirected to sign-in
// (otherwise the manifest/icon responses become HTML and fail to parse).
const PUBLIC_ASSETS = /^\/(manifest\.webmanifest|apple-icon|icon\.svg|favicon\.ico|robots\.txt|sitemap\.xml)$/;

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_ASSETS.test(pathname)) return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(`${p}?`));
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const { url, anonKey } = getPublicSupabaseEnv();

  // Explicit demo/local mode (dev/test only): do not enforce auth.
  if (getDataBackend() === "local") {
    return NextResponse.next({ request });
  }

  // Supabase mode but the public env is missing. In PRODUCTION this is a
  // misconfiguration: fail CLOSED — never serve a protected route unauthenticated
  // (do not silently degrade to the open demo backend). In dev, no-op.
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === "production" && !isPublicPath(request.nextUrl.pathname)) {
      return new NextResponse("Service unavailable: authentication backend is not configured.", {
        status: 503,
      });
    }
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // IMPORTANT: getUser() must be called to refresh the session cookie.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Already authenticated users shouldn't sit on the sign-in page.
  if (user && pathname.startsWith("/sign-in")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
