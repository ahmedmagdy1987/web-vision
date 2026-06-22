/**
 * RLS / organization-isolation matrix verified through the REAL PostgREST + Storage
 * APIs using authenticated per-role sessions (not UI visibility). Creates dedicated
 * test identities + a second org, runs allow/deny checks, then cleans everything up.
 * Does NOT touch the real seeded data beyond temporary rows it removes.
 *
 * Run:  node --env-file=.env.local scripts/rls-matrix.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !svc) { console.error("Missing env (run with --env-file=.env.local)."); process.exit(1); }

const admin = createClient(url, svc, { auth: { persistSession: false, autoRefreshToken: false } });
const rnd = () => randomBytes(18).toString("base64url");

async function ensureUser(email) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let u = list.users.find((x) => x.email === email);
  const password = rnd();
  if (!u) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    u = data.user;
  } else {
    await admin.auth.admin.updateUserById(u.id, { password, email_confirm: true });
  }
  return { id: u.id, email, password };
}
async function clientFor(user) {
  const c = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await c.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`sign in ${user.email}: ${error.message}`);
  return c;
}
async function setMember(org, uid, role) {
  await admin.from("organization_members").upsert(
    { organization_id: org, user_id: uid, role, status: "active" },
    { onConflict: "organization_id,user_id" },
  );
}

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });

// Orgs
const { data: orgA } = await admin.from("organizations").select("id").eq("slug", "malahi").single();
let { data: orgB } = await admin.from("organizations").select("id").eq("slug", "rls-test-org-b").maybeSingle();
if (!orgB) {
  const { data } = await admin.from("organizations").insert({ name: "RLS Test Org B", slug: "rls-test-org-b" }).select("id").single();
  orgB = data;
}

// Identities
const editorA = await ensureUser("rls-editor-a@web-vision.test");
const viewerA = await ensureUser("rls-viewer-a@web-vision.test");
const outsider = await ensureUser("rls-outsider@web-vision.test");
const ownerB = await ensureUser("rls-owner-b@web-vision.test");
await setMember(orgA.id, editorA.id, "editor");
await setMember(orgA.id, viewerA.id, "viewer");
await setMember(orgB.id, ownerB.id, "owner");
// outsider: intentionally no membership

let editorProductId = null;
let ownerBrandId = null;
try {
  // viewer A
  const cViewer = await clientFor(viewerA);
  {
    const { data } = await cViewer.from("brands").select("id").eq("organization_id", orgA.id);
    check("viewerA reads org A brands", (data?.length ?? 0) > 0, `rows=${data?.length ?? 0}`);
  }
  {
    const { error } = await cViewer.from("brands").insert({ organization_id: orgA.id, name: "Viewer Hack", slug: "viewer-hack-" + Date.now() });
    check("viewerA CANNOT insert brand (RLS)", !!error, error ? error.code ?? "denied" : "NO ERROR (bad)");
  }

  // editor A
  const cEditor = await clientFor(editorA);
  {
    const { data: b } = await cEditor.from("brands").select("id").eq("organization_id", orgA.id).limit(1).single();
    const { data, error } = await cEditor
      .from("products")
      .insert({ organization_id: orgA.id, brand_id: b.id, name: "RLS Editor Product", slug: "rls-editor-product-" + Date.now() })
      .select("id")
      .maybeSingle();
    editorProductId = data?.id ?? null;
    check("editorA CAN insert product", !error && !!editorProductId, error ? error.code ?? error.message : "ok");
  }
  {
    const { error } = await cEditor.from("brands").insert({ organization_id: orgA.id, name: "Editor Brand", slug: "editor-brand-" + Date.now() });
    check("editorA CANNOT insert brand (manage-only)", !!error, error ? error.code ?? "denied" : "NO ERROR (bad)");
  }

  // owner B — cross-org isolation
  const cOwnerB = await clientFor(ownerB);
  {
    const { data } = await cOwnerB.from("brands").select("id").eq("organization_id", orgA.id);
    check("ownerB CANNOT read org A brands", (data?.length ?? 0) === 0, `rows=${data?.length ?? 0}`);
  }
  {
    const { data: someA } = await admin.from("brands").select("id").eq("organization_id", orgA.id).limit(1).single();
    const { data } = await cOwnerB.from("brands").select("id").eq("id", someA.id);
    check("ownerB CANNOT read org A brand by guessed id", (data?.length ?? 0) === 0, `rows=${data?.length ?? 0}`);
  }
  {
    const { data: resA } = await admin.from("generation_results").select("storage_path").eq("organization_id", orgA.id).limit(1).single();
    const { data, error } = await cOwnerB.storage.from("web-vision").createSignedUrl(resA.storage_path, 60);
    check("ownerB CANNOT sign org A storage object", !!error || !data?.signedUrl, error ? "denied" : data?.signedUrl ? "GOT URL (bad)" : "denied");
  }

  // outsider — no membership
  const cOut = await clientFor(outsider);
  {
    const { data } = await cOut.from("brands").select("id");
    check("no-membership user reads zero brands", (data?.length ?? 0) === 0, `rows=${data?.length ?? 0}`);
  }

  // owner A — manage allowed
  {
    const cOwnerA = await clientFor({ email: process.env.E2E_TEST_EMAIL, password: process.env.E2E_TEST_PASSWORD });
    const { data, error } = await cOwnerA
      .from("brands")
      .insert({ organization_id: orgA.id, name: "RLS Owner Brand", slug: "rls-owner-brand-" + Date.now() })
      .select("id")
      .maybeSingle();
    ownerBrandId = data?.id ?? null;
    check("ownerA CAN insert brand (manage)", !error && !!ownerBrandId, error ? error.code ?? error.message : "ok");
  }
} finally {
  // cleanup: temporary rows + identities + org B (real seeded data untouched)
  try {
    if (editorProductId) await admin.from("products").delete().eq("id", editorProductId);
    if (ownerBrandId) await admin.from("brands").delete().eq("id", ownerBrandId);
    for (const u of [editorA, viewerA, outsider, ownerB]) {
      try { await admin.auth.admin.deleteUser(u.id); } catch { /* ignore */ }
    }
    await admin.from("organizations").delete().eq("id", orgB.id);
  } catch (e) {
    console.error("cleanup warning:", e instanceof Error ? e.message : e);
  }
}

const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ passed, total: results.length, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
