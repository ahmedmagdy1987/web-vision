"use client";

/**
 * Client auth + active-organization context.
 *
 *  - Demo mode (Supabase not configured): `ready` is immediate, no user, the app
 *    shell renders normally on the localStorage backend — preserving Phase 1/2.
 *  - Supabase mode: resolves the session, subscribes to auth changes, loads the
 *    user's organization memberships, and publishes the active org/user to the
 *    Supabase repository context so the collections hydrate.
 */
import * as React from "react";
import { useRouter } from "next/navigation";
import { isSupabaseBackend } from "@/lib/config/backend";
import { organizationRepository, type Organization, type OrgMembership } from "@/lib/repositories";
import { storage } from "@/lib/repositories/storage";
import { setActiveOrg, setActiveUser } from "@/lib/repositories/supabase/context";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { MembershipRole } from "@/lib/supabase/database.types";
import { can, type Capability } from "./permissions";

export interface AuthUser {
  id: string;
  email: string | null;
}

export interface AuthValue {
  mode: "demo" | "supabase";
  ready: boolean;
  user: AuthUser | null;
  orgs: OrgMembership[];
  activeOrg: Organization | null;
  role: MembershipRole | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  selectOrg: (orgId: string) => void;
  createOrganization: (name: string) => Promise<{ error?: string }>;
  /** Set the password for the current (invite/recovery) session. */
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
  /** Send a password setup/recovery email with the onboarding redirect. */
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
}

const ACTIVE_ORG_KEY = "auth:activeOrgId";
const AuthContext = React.createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabaseMode = isSupabaseBackend();
  const router = useRouter();
  const [ready, setReady] = React.useState(!supabaseMode);
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [orgs, setOrgs] = React.useState<OrgMembership[]>([]);
  const [activeOrgId, setActiveOrgIdState] = React.useState<string | null>(null);

  const applyOrg = React.useCallback((id: string | null) => {
    setActiveOrgIdState(id);
    setActiveOrg(id);
    if (id) storage.set(ACTIVE_ORG_KEY, id);
    else storage.remove(ACTIVE_ORG_KEY);
  }, []);

  const loadOrgs = React.useCallback(async () => {
    const memberships = await organizationRepository.listMine();
    setOrgs(memberships);
    const stored = storage.get<string>(ACTIVE_ORG_KEY);
    const next =
      memberships.find((m) => m.organization.id === stored)?.organization.id ??
      memberships[0]?.organization.id ??
      null;
    applyOrg(next);
  }, [applyOrg]);

  React.useEffect(() => {
    if (!supabaseMode) return;
    const supabase = getBrowserSupabase();
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      const u = data.user;
      if (u) {
        setUser({ id: u.id, email: u.email ?? null });
        setActiveUser(u.id);
        await loadOrgs().catch(() => undefined);
      }
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u ? { id: u.id, email: u.email ?? null } : null);
      setActiveUser(u?.id ?? null);
      if (!u) {
        setOrgs([]);
        applyOrg(null);
      } else {
        void loadOrgs().catch(() => undefined);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [supabaseMode, loadOrgs, applyOrg]);

  const value: AuthValue = {
    mode: supabaseMode ? "supabase" : "demo",
    ready,
    user,
    orgs,
    activeOrg: orgs.find((o) => o.organization.id === activeOrgId)?.organization ?? null,
    role: orgs.find((o) => o.organization.id === activeOrgId)?.role ?? null,
    signInWithPassword: async (email, password) => {
      try {
        const { error } = await getBrowserSupabase().auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Sign in failed." };
      }
    },
    signOut: async () => {
      try {
        await getBrowserSupabase().auth.signOut();
      } finally {
        setUser(null);
        setOrgs([]);
        applyOrg(null);
        router.push("/sign-in");
      }
    },
    selectOrg: (id) => applyOrg(id),
    createOrganization: async (name) => {
      try {
        const org = await organizationRepository.create(name);
        await loadOrgs();
        applyOrg(org.id);
        return {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not create organization." };
      }
    },
    updatePassword: async (newPassword) => {
      try {
        const { error } = await getBrowserSupabase().auth.updateUser({ password: newPassword });
        return error ? { error: error.message } : {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not update password." };
      }
    },
    sendPasswordReset: async (email) => {
      try {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent("/auth/set-password")}`;
        const { error } = await getBrowserSupabase().auth.resetPasswordForEmail(email, { redirectTo });
        return error ? { error: error.message } : {};
      } catch (e) {
        return { error: e instanceof Error ? e.message : "Could not send the email." };
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>.");
  return ctx;
}

/**
 * Capability check for the current user. In demo mode everything is permitted
 * (no auth); in Supabase mode it mirrors the RLS role matrix so the UI can
 * hide/disable actions the database would reject anyway.
 */
export function useCan(capability: Capability): boolean {
  const { mode, role } = useAuth();
  return mode === "demo" ? true : can(role, capability);
}
