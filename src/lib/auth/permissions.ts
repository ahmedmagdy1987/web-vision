/**
 * Role → capability matrix. This mirrors the SQL RLS policies exactly so the UI
 * can hide/disable actions a user cannot perform — but the database remains the
 * source of truth for authorization (RLS enforces the same rules server-side).
 */
import type { MembershipRole } from "@/lib/supabase/database.types";

export type Capability =
  | "org:manage"
  | "members:manage"
  | "brands:manage"
  | "categories:manage"
  | "brandAssets:write"
  | "products:write"
  | "productAssets:write"
  | "locations:write"
  | "locationAssets:write"
  | "presets:write"
  | "jobs:write"
  | "results:write"
  | "read";

const MANAGE: MembershipRole[] = ["owner", "admin"];
const EDITOR_PLUS: MembershipRole[] = ["owner", "admin", "editor"];
const ALL: MembershipRole[] = ["owner", "admin", "editor", "viewer"];

const MATRIX: Record<Capability, MembershipRole[]> = {
  "org:manage": MANAGE,
  "members:manage": MANAGE,
  "brands:manage": MANAGE,
  "categories:manage": MANAGE,
  "brandAssets:write": EDITOR_PLUS,
  "products:write": EDITOR_PLUS,
  "productAssets:write": EDITOR_PLUS,
  "locations:write": EDITOR_PLUS,
  "locationAssets:write": EDITOR_PLUS,
  "presets:write": EDITOR_PLUS,
  "jobs:write": EDITOR_PLUS,
  "results:write": EDITOR_PLUS,
  read: ALL,
};

export function can(role: MembershipRole | null | undefined, capability: Capability): boolean {
  if (!role) return false;
  return MATRIX[capability].includes(role);
}

/** Owner/admin — can manage structural org configuration. */
export function isManager(role: MembershipRole | null | undefined): boolean {
  return can(role, "org:manage");
}

/** Editor and above — can create/edit operational assets + generation records. */
export function canEdit(role: MembershipRole | null | undefined): boolean {
  return can(role, "products:write");
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

export const ROLE_RANK: Record<MembershipRole, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer: 1,
};
