/**
 * Shared runtime context for the Supabase repositories: the active organization,
 * the signed-in user, and the browser client. The auth/org provider sets these
 * after resolving the session + memberships (see src/lib/auth/*).
 */
import type { ID } from "@/lib/domain";
import { getBrowserSupabase } from "@/lib/supabase/client";

let activeOrgId: ID | null = null;
let activeUserId: ID | null = null;
const listeners = new Set<() => void>();

export function setActiveOrg(id: ID | null): void {
  if (activeOrgId === id) return;
  activeOrgId = id;
  for (const l of listeners) l();
}

export function getActiveOrgId(): ID | null {
  return activeOrgId;
}

export function requireActiveOrgId(): ID {
  if (!activeOrgId) {
    throw new Error("[web-vision] No active organization. Sign in and select an organization first.");
  }
  return activeOrgId;
}

export function setActiveUser(id: ID | null): void {
  activeUserId = id;
}

export function getActiveUserId(): ID | null {
  return activeUserId;
}

/** Subscribe to active-org changes (repos re-hydrate when the org switches). */
export function onActiveOrgChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The browser Supabase client (RLS as the signed-in user). */
export function db() {
  return getBrowserSupabase();
}
