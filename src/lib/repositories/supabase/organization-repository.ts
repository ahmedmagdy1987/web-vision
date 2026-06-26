/**
 * Organizations + memberships access (async — used by the auth/session flow, not
 * the synchronous useSyncExternalStore collections).
 */
import type { MembershipRole, OrganizationRow } from "@/lib/supabase/database.types";
import { db } from "./context";

export interface Organization {
  id: string;
  name: string;
  slug: string;
}

export interface OrgMembership {
  organization: Organization;
  role: MembershipRole;
}

function toOrg(row: Pick<OrganizationRow, "id" | "name" | "slug">): Organization {
  return { id: row.id, name: row.name, slug: row.slug };
}

export const organizationRepository = {
  /** Active-status memberships of the signed-in user, with their organization. */
  async listMine(): Promise<OrgMembership[]> {
    const supabase = db();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from("organization_members")
      .select("role, organizations(id, name, slug)")
      .eq("user_id", user.id)
      .eq("status", "active");
    if (error) throw error;
    const rows = (data ?? []) as unknown as Array<{
      role: MembershipRole;
      organizations: Pick<OrganizationRow, "id" | "name" | "slug"> | null;
    }>;
    return rows
      .filter((r) => r.organizations)
      .map((r) => ({ role: r.role, organization: toOrg(r.organizations!) }));
  },

  /** The signed-in user's role in a given organization, or null. */
  async myRole(orgId: string): Promise<MembershipRole | null> {
    const supabase = db();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from("organization_members")
      .select("role")
      .eq("organization_id", orgId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (error) throw error;
    return data?.role ?? null;
  },
};
