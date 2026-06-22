/**
 * Live verification of private-Storage asset operations for product images via
 * the OWNER's authenticated session (real RLS + storage policies, not UI):
 * upload → signed URL resolves → replace primary → delete → object gone.
 * Cleans up after itself.  Run: node --env-file=.env.local scripts/verify-asset-ops.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;
if (!url || !anon || !svc || !email || !password) { console.error("Missing env."); process.exit(1); }

const admin = createClient(url, svc, { auth: { persistSession: false } });
const owner = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
{
  const { error } = await owner.auth.signInWithPassword({ email, password });
  if (error) { console.error("owner sign in failed:", error.message); process.exit(1); }
}

const { data: org } = await admin.from("organizations").select("id").eq("slug", "malahi").single();
const { data: product } = await owner.from("products").select("id").eq("organization_id", org.id).limit(1).single();

const results = [];
const check = (name, pass, detail = "") => results.push({ name, pass, detail });
const svg = (n) => `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect width="800" height="600" fill="#6d28d9"/><text x="40" y="320" font-size="40" fill="#fff">Asset ${n} PLACEHOLDER</text></svg>`;

const a1 = randomUUID();
const a2 = randomUUID();
const p1 = `organizations/${org.id}/products/${product.id}/${a1}.svg`;
const p2 = `organizations/${org.id}/products/${product.id}/${a2}.svg`;

try {
  // upload + insert (primary)
  const u1 = await owner.storage.from("web-vision").upload(p1, new Blob([svg(1)], { type: "image/svg+xml" }), { contentType: "image/svg+xml", upsert: true });
  const i1 = await owner.from("product_assets").insert({ id: a1, product_id: product.id, asset_role: "main", storage_bucket: "web-vision", storage_path: p1, mime_type: "image/svg+xml", is_primary: true, sort_order: 0 });
  check("owner uploads + inserts primary product asset", !u1.error && !i1.error, u1.error?.message || i1.error?.message || "ok");

  // signed URL resolves
  const s1 = await owner.storage.from("web-vision").createSignedUrl(p1, 60);
  let fetchOk = false;
  if (s1.data?.signedUrl) { const r = await fetch(s1.data.signedUrl); fetchOk = r.ok; }
  check("signed URL for product asset resolves (HTTP ok)", fetchOk, s1.error?.message || (fetchOk ? "200" : "no fetch"));

  // add second, replace primary
  await owner.storage.from("web-vision").upload(p2, new Blob([svg(2)], { type: "image/svg+xml" }), { contentType: "image/svg+xml", upsert: true });
  await owner.from("product_assets").insert({ id: a2, product_id: product.id, asset_role: "reference", storage_bucket: "web-vision", storage_path: p2, mime_type: "image/svg+xml", is_primary: false, sort_order: 1 });
  await owner.from("product_assets").update({ is_primary: false, asset_role: "reference" }).eq("id", a1);
  await owner.from("product_assets").update({ is_primary: true, asset_role: "main" }).eq("id", a2);
  const { data: prim } = await owner.from("product_assets").select("id").eq("product_id", product.id).eq("is_primary", true);
  check("replace primary product image", prim?.length === 1 && prim[0].id === a2, `primary=${prim?.map((x) => x.id).join(",")}`);

  // remove an asset (row + object)
  await owner.from("product_assets").delete().eq("id", a1);
  const rm = await owner.storage.from("web-vision").remove([p1]);
  const s1after = await owner.storage.from("web-vision").createSignedUrl(p1, 60);
  let goneOk = true;
  if (s1after.data?.signedUrl) { const r = await fetch(s1after.data.signedUrl); goneOk = !r.ok; }
  check("removed asset object is gone (signed URL 404)", !rm.error && goneOk, rm.error?.message || (goneOk ? "gone" : "still served"));
} finally {
  // cleanup any remaining test assets + objects
  await admin.from("product_assets").delete().in("id", [a1, a2]);
  await admin.storage.from("web-vision").remove([p1, p2]);
}

const passed = results.filter((r) => r.pass).length;
console.log(JSON.stringify({ passed, total: results.length, results }, null, 2));
process.exit(passed === results.length ? 0 : 1);
