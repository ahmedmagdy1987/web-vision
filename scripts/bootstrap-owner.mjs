/**
 * One-time owner bootstrap for a live Supabase project (idempotent).
 *
 * Creates (or reuses) a confirmed internal owner/test user, ensures its profile,
 * and grants it `owner` membership of the seeded Malahi organization. The user
 * password is crypto-random, generated here and written ONLY to the gitignored
 * .env.local (as E2E_TEST_EMAIL / E2E_TEST_PASSWORD) — never printed, committed,
 * or passed as a shell argument. The real owner can reset it via the Supabase
 * dashboard, or be invited with auth.admin.inviteUserByEmail (see docs/SUPABASE.md).
 *
 * Run:  node --env-file=.env.local scripts/bootstrap-owner.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY (run with --env-file=.env.local).");
  process.exit(1);
}

const ENV_PATH = ".env.local";
const OWNER_EMAIL = process.env.E2E_TEST_EMAIL || "owner@web-vision.test";
const ORG_SLUG = "malahi";

function readEnvVal(key) {
  if (!existsSync(ENV_PATH)) return undefined;
  const m = readFileSync(ENV_PATH, "utf8").match(new RegExp(`^${key}=(.*)$`, "m"));
  return m ? m[1] : undefined;
}
function upsertEnvVal(key, value) {
  let content = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  content = re.test(content) ? content.replace(re, line) : content.replace(/\s*$/, "\n") + line + "\n";
  writeFileSync(ENV_PATH, content);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

// 1. find or create the owner user
const { data: list, error: listErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
if (listErr) { console.error("listUsers failed:", listErr.message); process.exit(1); }
const existing = list.users.find((u) => u.email === OWNER_EMAIL);

let userId;
let password = readEnvVal("E2E_TEST_PASSWORD");
let userState;
if (existing) {
  userId = existing.id;
  if (!password) {
    password = randomBytes(24).toString("base64url");
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
    upsertEnvVal("E2E_TEST_EMAIL", OWNER_EMAIL);
    upsertEnvVal("E2E_TEST_PASSWORD", password);
  }
  userState = "reused";
} else {
  password = randomBytes(24).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email: OWNER_EMAIL, password, email_confirm: true });
  if (error) { console.error("createUser failed:", error.message); process.exit(1); }
  userId = data.user.id;
  upsertEnvVal("E2E_TEST_EMAIL", OWNER_EMAIL);
  upsertEnvVal("E2E_TEST_PASSWORD", password);
  userState = "created";
}

// 2. ensure profile (handle_new_user trigger normally creates it)
const { data: profile } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
if (!profile) {
  const { error } = await admin.from("profiles").insert({ id: userId, display_name: "Malahi Owner" });
  if (error) { console.error("profile insert failed:", error.message); process.exit(1); }
}

// 3. seeded org
const { data: org, error: orgErr } = await admin.from("organizations").select("id, name").eq("slug", ORG_SLUG).maybeSingle();
if (orgErr || !org) { console.error("seeded org not found — run the seed first."); process.exit(1); }

// 4. ensure owner membership (idempotent)
const { data: member } = await admin
  .from("organization_members")
  .select("id, role")
  .eq("organization_id", org.id)
  .eq("user_id", userId)
  .maybeSingle();
if (!member) {
  const { error } = await admin
    .from("organization_members")
    .insert({ organization_id: org.id, user_id: userId, role: "owner", status: "active" });
  if (error) { console.error("membership insert failed:", error.message); process.exit(1); }
} else if (member.role !== "owner") {
  await admin.from("organization_members").update({ role: "owner", status: "active" }).eq("id", member.id);
}

// 5. verify (IDs must match across auth user / profile / membership)
const { data: verify } = await admin
  .from("organization_members")
  .select("role, status, organization_id, user_id")
  .eq("user_id", userId)
  .eq("organization_id", org.id)
  .single();
const { data: prof } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

console.log(
  JSON.stringify(
    {
      ok: true,
      user: userState,
      userId,
      email: OWNER_EMAIL,
      profileMatches: prof?.id === userId,
      orgId: org.id,
      orgName: org.name,
      membershipRole: verify?.role,
      membershipStatus: verify?.status,
      credsWrittenTo: ".env.local (E2E_TEST_EMAIL / E2E_TEST_PASSWORD)",
    },
    null,
    2,
  ),
);
