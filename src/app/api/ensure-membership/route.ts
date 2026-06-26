import "server-only";
import { NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabase/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

// Single-org access model — server-side fallback. Ensures the AUTHENTICATED user
// is an ACTIVE member of the one canonical Malahi organization, so a valid
// account goes straight into the app (never an Access-pending screen). This is
// the runtime guarantee for accounts created before the DB trigger, or whenever
// the trigger hasn't run. It uses the service-role admin client because the
// members_insert RLS policy forbids a user self-inserting. It is idempotent,
// NEVER creates another organization, and NEVER downgrades an existing
// owner/admin role.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MALAHI_SLUG = "malahi";

export async function POST() {
  const sb = await getServerSupabase();
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  let admin;
  try {
    admin = getAdminSupabase();
  } catch {
    return NextResponse.json(
      { error: "setup", message: "Server is not configured for access provisioning." },
      { status: 503 },
    );
  }

  // Resolve the single Malahi org by slug (the canonical hidden tenant).
  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", MALAHI_SLUG)
    .maybeSingle();
  if (orgErr || !org) {
    return NextResponse.json(
      { error: "setup", message: "The Malahi organization could not be found." },
      { status: 503 },
    );
  }

  const { data: existing } = await admin
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", org.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin
      .from("organization_members")
      .insert({ organization_id: org.id, user_id: user.id, role: "editor", status: "active" });
    // Tolerate a concurrent insert (unique violation) — the membership exists.
    if (error && !/duplicate key|unique/i.test(error.message)) {
      return NextResponse.json(
        { error: "setup", message: "Could not provision access. Please try again." },
        { status: 503 },
      );
    }
  } else if (existing.status !== "active") {
    // Reactivate a suspended/invited membership — but never change the role
    // (preserve any existing owner/admin).
    await admin.from("organization_members").update({ status: "active" }).eq("id", existing.id);
  }

  return NextResponse.json({ ok: true });
}
