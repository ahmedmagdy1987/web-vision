/**
 * Single-org backfill. Grants every existing Supabase Auth user an ACTIVE
 * 'editor' membership in the canonical Malahi organization if they don't already
 * have a membership. Idempotent and NON-DESTRUCTIVE: users who already have ANY
 * membership row are left untouched (existing owner/admin roles preserved). Never
 * creates another organization.
 *
 * Privileged (service-role). Run deliberately:
 *     node --env-file=.env.local scripts/backfill-membership.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing env (run with --env-file=.env.local).");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: org, error: orgErr } = await admin
  .from("organizations")
  .select("id")
  .eq("slug", "malahi")
  .maybeSingle();
if (orgErr || !org) {
  console.error("Malahi organization not found — aborting (no changes made).");
  process.exit(1);
}

// All existing members of the org (to skip), and a total-org-count guard.
const { data: members } = await admin
  .from("organization_members")
  .select("user_id")
  .eq("organization_id", org.id);
const haveMembership = new Set((members ?? []).map((m) => m.user_id));

const { count: orgCount } = await admin.from("organizations").select("id", { count: "exact", head: true });

// Page through all auth users.
const allUsers = [];
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  allUsers.push(...data.users);
  if (data.users.length < 200) break;
}

let backfilled = 0;
let alreadyMember = 0;
let failed = 0;
for (const u of allUsers) {
  if (haveMembership.has(u.id)) {
    alreadyMember++;
    continue;
  }
  const { error } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: u.id, role: "editor", status: "active" });
  if (error && !/duplicate key|unique/i.test(error.message)) {
    failed++;
  } else {
    backfilled++;
  }
}

console.log(
  JSON.stringify(
    {
      totalAuthUsers: allUsers.length,
      alreadyMember,
      backfilledAsEditor: backfilled,
      failed,
      organizationsTotal: orgCount,
      onlyMalahiOrgExists: orgCount === 1,
    },
    null,
    2,
  ),
);
process.exit(failed > 0 ? 1 : 0);
