/**
 * Pure resolution of which access screen the app shell should render, from the
 * separated auth/membership states. Extracted so the (timing-sensitive) gating
 * logic is unit-testable without React/Supabase.
 *
 * Single-org model: there is NO "Access pending" approval workflow. Every valid
 * account is auto-provisioned into the one Malahi org (DB trigger + server-side
 * fallback). An authenticated user without an active org therefore means
 * provisioning is either in progress ("Checking your access…") or it genuinely
 * failed (a retryable system-setup error) — never a pending-approval state.
 */
export type MembershipStatus = "loading" | "ready" | "error";

export type AccessGate =
  | "session-loading"
  | "redirect-signin"
  | "membership-loading"
  | "membership-error"
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
  // 4. Authenticated, but no active org — provisioning in progress vs. failed.
  if (membershipStatus === "loading") return "membership-loading";
  // 5. Membership genuinely missing or the check failed → retryable system-setup
  //    error. NEVER an Access-pending approval screen.
  return "membership-error";
}
