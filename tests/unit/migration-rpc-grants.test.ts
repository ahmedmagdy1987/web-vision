import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// Locks the final create_organization EXECUTE privileges in the security-hardening
// migration: revoking from `authenticated` alone is insufficient because PostgreSQL
// grants EXECUTE to PUBLIC by default — so PUBLIC + anon + authenticated must all be
// revoked and only service_role re-granted. Also guards that the membership-role /
// last-owner trigger protections remain.
const sql = readFileSync("supabase/migrations/20260626130000_security_hardening.sql", "utf8")
  .toLowerCase()
  .replace(/\s+/g, " ");

const FN = "public.create_organization(text, text)";

describe("security-hardening migration — final RPC privileges", () => {
  it("revokes EXECUTE from public, anon and authenticated", () => {
    for (const role of ["public", "anon", "authenticated"]) {
      expect(sql, `revoke from ${role}`).toContain(`revoke execute on function ${FN} from ${role};`);
    }
  });

  it("re-grants EXECUTE only to service_role", () => {
    expect(sql).toContain(`grant execute on function ${FN} to service_role;`);
    // No grant of this function to anon / authenticated / public remains.
    expect(sql).not.toMatch(/grant execute on function public\.create_organization\(text, text\) to (anon|authenticated|public)/);
  });

  it("keeps the membership-role + last-owner trigger protections", () => {
    expect(sql).toContain("create trigger trg_member_role_rules");
    expect(sql).toContain("before insert or update or delete on public.organization_members");
    expect(sql).toContain("only an owner can grant the owner role");
    expect(sql).toContain("cannot demote the last owner");
    expect(sql).toContain("cannot remove the last owner");
  });
});
