/**
 * Pure resolution of which access screen the app shell should render, from the
 * separated auth/membership states. Extracted so the (timing-sensitive) gating
 * logic is unit-testable without React/Supabase.
 *
 * Crucially, "pending" (no authorized membership) is returned ONLY after the
 * membership lookup has COMPLETED with no active org — never while it is still
 * loading — so an authorized user never flashes the Access-pending screen.
 */
export type MembershipStatus = "loading" | "ready" | "error";

export type AccessGate =
  | "session-loading"
  | "redirect-signin"
  | "membership-loading"
  | "membership-error"
  | "pending"
  | "authorized";

export interface AccessGateInput {
  mode: "demo" | "supabase";
  /** Session/authentication resolution has completed. */
  ready: boolean;
  hasUser: boolean;
  /** An authorized active membership has resolved. */
  hasActiveOrg: boolean;
  membershipStatus: MembershipStatus;
}

export function resolveAccessGate({
  mode,
  ready,
  hasUser,
  hasActiveOrg,
  membershipStatus,
}: AccessGateInput): AccessGate {
  // Demo mode has no auth: the app is always open.
  if (mode === "demo") return "authorized";
  // 1. Session/authentication still resolving.
  if (!ready) return "session-loading";
  // 2. Session resolved, no user → the middleware will send them to /sign-in.
  if (!hasUser) return "redirect-signin";
  // 3. Authorized active member.
  if (hasActiveOrg) return "authorized";
  // 4. Authenticated, but no active org yet — distinguish loading/error/pending.
  if (membershipStatus === "error") return "membership-error";
  if (membershipStatus === "loading") return "membership-loading";
  // 5. Membership lookup completed successfully and found no active membership.
  return "pending";
}
