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
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
