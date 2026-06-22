/**
 * Seed a completed demo generation job + results into the live project, with
 * real placeholder objects uploaded to private Storage (binary assets can't be
 * created from seed.sql). Idempotent: fixed UUIDs, skips if the job exists.
 *
 * Run:  node --env-file=.env.local scripts/seed-results.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing env (run with --env-file=.env.local).");
  process.exit(1);
}
const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const JOB_ID = "00000000-0000-4000-8000-0000000000a1";
const RESULTS = [
  { id: "00000000-0000-4000-8000-0000000000b1", aspect: "1:1", w: 1280, h: 1280, seed: 1001 },
  { id: "00000000-0000-4000-8000-0000000000b2", aspect: "9:16", w: 720, h: 1280, seed: 1002 },
];

function placeholderSvg(label, sub, w, h, accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${accent}"/><stop offset="1" stop-color="#1e1b4b"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/><rect x="${w - 200}" y="24" width="176" height="34" rx="17" fill="rgba(0,0,0,0.35)"/><text x="${w - 112}" y="47" font-family="sans-serif" font-size="16" fill="#fff" text-anchor="middle" letter-spacing="2">PLACEHOLDER</text><text x="40" y="${h - 70}" font-family="sans-serif" font-size="44" font-weight="700" fill="#fff">${label}</text><text x="40" y="${h - 30}" font-family="sans-serif" font-size="24" fill="rgba(255,255,255,0.85)">${sub}</text></svg>`;
}

const { data: org } = await admin.from("organizations").select("id").eq("slug", "malahi").maybeSingle();
if (!org) { console.error("seeded org not found — run the seed first."); process.exit(1); }
const orgId = org.id;

const { data: existing } = await admin.from("generation_jobs").select("id").eq("id", JOB_ID).maybeSingle();
if (existing) {
  // Normalize the demo results' review/favorite state so the live suite starts clean.
  await admin
    .from("generation_results")
    .update({ is_favorite: false, review_status: "draft" })
    .eq("job_id", JOB_ID);
  console.log(JSON.stringify({ ok: true, reset: true, reason: "demo job already seeded; state reset", jobId: JOB_ID }, null, 2));
  process.exit(0);
}

const { data: brands } = await admin.from("brands").select("id, name, accent_color").eq("organization_id", orgId).order("created_at");
const { data: products } = await admin.from("products").select("id, name, brand_id").eq("organization_id", orgId);
const { data: locations } = await admin.from("locations").select("id, name, brand_id").eq("organization_id", orgId);
const brand = brands?.[0];
if (!brand) { console.error("no seeded brand found."); process.exit(1); }
const brandProducts = (products ?? []).filter((p) => p.brand_id === brand.id);
const loc = (locations ?? []).find((l) => !l.brand_id || l.brand_id === brand.id) ?? locations?.[0] ?? null;

const settings = {
  visualizationType: "lifestyle-scene", placement: "auto", cameraAngle: "eye-level",
  environmentType: "retail", lighting: "natural", visualStyle: "photorealistic",
  aspectRatio: "1:1", outputCount: RESULTS.length, productScale: "balanced",
  brandVisibility: "balanced", peopleInScene: "none", preserveArchitecture: true,
  removeExistingObjects: false, creativity: 40,
};
const instructions = { sections: [{ key: "system", label: "System", content: "Seeded demo result." }], text: "Seeded demo result." };
const request = {
  id: "00000000-0000-4000-8000-0000000000c1",
  brandId: brand.id, productIds: brandProducts.map((p) => p.id), locationId: loc?.id,
  uploadedAssets: [], settings, instructions, notes: "Seeded demo job", createdAt: new Date().toISOString(),
};

const { error: jobErr } = await admin.from("generation_jobs").insert({
  id: JOB_ID, organization_id: orgId, brand_id: brand.id, location_id: loc?.id ?? null,
  status: "completed", progress: 100, request, instructions, provider: "mock",
  created_by: null, completed_at: new Date().toISOString(),
});
if (jobErr) { console.error("job insert failed:", jobErr.message); process.exit(1); }
if (brandProducts.length) {
  await admin.from("generation_job_products").insert(brandProducts.map((p) => ({ job_id: JOB_ID, product_id: p.id })));
}

for (const [i, r] of RESULTS.entries()) {
  const path = `organizations/${orgId}/results/${JOB_ID}/${r.id}.svg`;
  const svg = placeholderSvg(brand.name, loc?.name ?? "Demo location", r.w, r.h, brand.accent_color);
  const up = await admin.storage.from("web-vision").upload(path, new Blob([svg], { type: "image/svg+xml" }), {
    contentType: "image/svg+xml", upsert: true,
  });
  if (up.error) { console.error("upload failed:", up.error.message); process.exit(1); }
  const snapshot = {
    brandId: brand.id, brandName: brand.name, brandAccent: brand.accent_color,
    productIds: brandProducts.map((p) => p.id), productNames: brandProducts.map((p) => p.name),
    locationId: loc?.id, locationName: loc?.name, settings: { ...settings, aspectRatio: r.aspect },
    instructions, notes: "Seeded demo result",
  };
  const { error: resErr } = await admin.from("generation_results").insert({
    id: r.id, job_id: JOB_ID, organization_id: orgId, storage_bucket: "web-vision", storage_path: path,
    mime_type: "image/svg+xml", width: r.w, height: r.h, aspect_ratio: r.aspect, seed: r.seed,
    result_index: i, review_status: "draft", is_favorite: false, snapshot,
    provider_metadata: { requestId: request.id, provider: "mock" },
  });
  if (resErr) { console.error("result insert failed:", resErr.message); process.exit(1); }
}

console.log(JSON.stringify({ ok: true, jobId: JOB_ID, results: RESULTS.length, brand: brand.name, orgId }, null, 2));
