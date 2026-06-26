/**
 * Open-redirect protection for auth flows. Only same-origin relative paths are
 * allowed as post-auth destinations; anything else falls back to a safe default.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next) return fallback;
  // Reject absolute URLs, protocol-relative ("//evil"), and backslash tricks.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || next.includes("://")) {
    return fallback;
  }
  return next;
}

/** Absolute base URL for auth redirects (browser origin, else configured site URL). */
export function authBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured;
  // Never build production auth/callback links against localhost — require the
  // site URL to be configured. The localhost fallback is dev-only.
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production for auth redirects.");
  }
  return "http://localhost:3000";
}
