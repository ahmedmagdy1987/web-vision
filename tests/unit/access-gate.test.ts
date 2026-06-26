import { describe, it, expect } from "vitest";
import { resolveAccessGate, type AccessGateInput } from "@/lib/auth/access-gate";

const base: AccessGateInput = {
  mode: "supabase",
  ready: true,
  hasUser: true,
  hasActiveOrg: false,
  membershipStatus: "ready",
};

describe("resolveAccessGate — no Access-pending flash for authorized users", () => {
  it("demo mode is always authorized", () => {
    expect(
      resolveAccessGate({ ...base, mode: "demo", ready: false, hasUser: false, membershipStatus: "loading" }),
    ).toBe("authorized");
  });

  it("session still resolving → session-loading (no sign-in / pending flash)", () => {
    expect(resolveAccessGate({ ...base, ready: false })).toBe("session-loading");
  });

  it("resolved session with no user → redirect-signin", () => {
    expect(resolveAccessGate({ ...base, hasUser: false })).toBe("redirect-signin");
  });

  it("an authorized member is authorized regardless of membership status (never pending)", () => {
    expect(resolveAccessGate({ ...base, hasActiveOrg: true, membershipStatus: "ready" })).toBe("authorized");
    expect(resolveAccessGate({ ...base, hasActiveOrg: true, membershipStatus: "loading" })).toBe("authorized");
    expect(resolveAccessGate({ ...base, hasActiveOrg: true, membershipStatus: "error" })).toBe("authorized");
  });

  it("membership still loading → membership-loading (Checking your access…), NOT pending", () => {
    expect(resolveAccessGate({ ...base, hasActiveOrg: false, membershipStatus: "loading" })).toBe(
      "membership-loading",
    );
  });

  it("membership fetch failed → membership-error (retryable), NOT pending", () => {
    expect(resolveAccessGate({ ...base, hasActiveOrg: false, membershipStatus: "error" })).toBe(
      "membership-error",
    );
  });

  it("Access pending ONLY after a completed, successful, empty membership check", () => {
    expect(resolveAccessGate({ ...base, hasActiveOrg: false, membershipStatus: "ready" })).toBe("pending");
  });
});
