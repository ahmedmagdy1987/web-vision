# Phase 3.4.3A — OpenAI provider correctness & security hardening

Continues `phase-3-4-3-final-polish-openai-foundation` (baseline `95b685d`).
Backend/security only — the approved 3.4.3 UX is unchanged. Provider stays **mock**;
no paid OpenAI call (owner-gated).

## 1. Corrected native + final size mappings

The previous adapter sent **unsupported** custom sizes (4:5→1024x1280, 16:9→1536x864,
9:16→864x1536). The Images Edit API accepts only `auto / 1024x1024 / 1536x1024 / 1024x1536`.

| Aspect | Native (sent to OpenAI) | Final (after post-process) |
|---|---|---|
| 1:1  | 1024×1024 | 1024×1024 |
| 4:5  | 1024×1536 | 1024×1280 |
| 16:9 | 1536×1024 | 1536×864  |
| 9:16 | 1024×1536 | 864×1536  |

`openAiNativeSize()` only ever returns a member of `VALID_OPENAI_NATIVE_SIZES` — a test
asserts this for **every** aspect, so no unsupported dimension can reach OpenAI.

## 2. Post-processing behavior

`postProcessToFinal()` (sharp, server-only) performs a **deterministic centered crop**
of the native image to the exact final size — `extract({ left, top, width, height })`
with `left/top = floor((native − final)/2)`. **No upscaling, no stretching**; quality
preserved (crop, then re-encode WebP q90). If the native image were ever smaller than
the final (shouldn't happen), it falls back to a centered cover-fit. The hidden prompt
now includes **composition-safe guidance** ("keep all products + logo within the central
safe area … leave margins") so key subjects survive the crop. The **final** width/height
+ aspect are stored as the result dimensions; the **native** size is kept separately in
`provider_metadata`. Tests assert the exact final pixels for all four ratios (real sharp).

## 3. Input fidelity

The edit request sends `input_fidelity: "high"` (asserted by test) to preserve product
geometry, materials, branding surfaces, logo lettering, location architecture and camera
perspective. Quality remains **medium** for the first paid test. Neither is an
employee-facing control (both are server config).

## 4. Client/server request boundary (no SSRF, no client URLs)

The browser now submits **only trusted identifiers + settings**: `organizationId,
brandId, logoId, productIds, locationId, settings, notes?, projectId?, idempotencyKey`
(`requestOpenAIGeneration` in `generation-client.ts`). The obsolete URL-posting client
adapter was **removed**. The server route validates a `z.object(...).strict()` body —
any extra field (e.g. a client `url`/`references`) is rejected — so there is **no
arbitrary-URL server-fetch path**. The server resolves each asset from the DB, mints
**short-lived (10 min) signed URLs server-side**, fetches the bytes and converts them to
upload files. Rejected: external URLs, client-supplied signed URLs, unknown IDs,
cross-org assets, archived/deleted assets, unauthenticated requests.

## 5. Auth + organization validation

`SupabaseGenerationGateway.authorize()` uses `getServerSupabase()` → `auth.getUser()`
(401 if absent), then `organization_members` (`organization_id`, `user_id`,
`status='active'`) and requires a writer role (`owner/admin/editor`, else 403). Every
asset load is org-scoped + active-only (`brands`/`products`/`locations` by
`organization_id` + `status='active'`; `brand_assets` by `brand_id` + `status='active'`)
with RLS (user-bound client) as a second line of defense — any miss → 404.

## 6. Provider selection (server-only)

`getImageProvider()` now reads **only** `IMAGE_GENERATION_PROVIDER` (the
`NEXT_PUBLIC_IMAGE_GENERATION_PROVIDER` mirror was removed from code + `.env.example`).
Unknown values throw; the route rejects anything but `openai`; there is **no silent
fallback to mock**. The browser never selects or runs the real provider.

## 7. Endpoint protections (`/api/generate-image`)

Authenticated session + active org membership + writer-role check; strict zod body
validation; **max product count** (`OPENAI_MAX_INPUT_PRODUCTS`, default 3; the schema
also hard-caps the array); 16 KB request-body limit; **idempotency** (the
`idempotencyKey` is the job id — an existing completed job is returned, never re-charged);
**per-user/org rate limiting** (recent-job count window → 429); provider timeout +
**bounded retries that skip 4xx / content-policy** (`isRetryableProviderError`); safe,
generic error responses (never the key or raw provider payload).

## 8. Job / result persistence (full lifecycle, server-side)

`runOpenAIGeneration` wires the whole lifecycle, not just the adapter: authorize →
idempotency → rate-limit → validate → resolve+order references → **create job
(processing)** → OpenAI (capturing the request id) → **post-process to final** → **upload
to private Storage** (`resultPath`) → **create result** storing provider, model, quality,
input fidelity, native size, final width/height, requested aspect, MIME, usage metadata,
estimated cost (in `provider_metadata`) + the snapshot → **complete job**. On failure:
`failJob` with a safe `error_code`/`error_message` (note: column is `error_message`), no
result persisted, retry preserved via the stable idempotency key, no duplicate paid call.
No API keys / auth headers / raw responses are persisted. Uses existing JSON columns
(`request`, `snapshot`, `provider_metadata`) — **no migration required**.

## Tests & exact results

- `typecheck` ✓ (0) · `lint` ✓ (0) · `build` ✓
- `test:unit` → **64 passed** (51 prior + 13 new/updated): native sizes ∈ supported set
  (every ratio), exact final dimensions via real sharp (all four ratios), input ordering,
  `input_fidelity:"high"`, valid size sent, retry-on-5xx / **no-retry-on-4xx**, abort;
  orchestrator — unauthenticated (401), forbidden (403), unknown/cross-org/archived (404,
  no job), over-cap (400), idempotency reuse (no paid call), rate-limit (429), full
  success persistence (provider/model/quality/fidelity/native+final size/aspect/cost),
  failure lifecycle (failJob, safe message, no result), no silent fallback.
- Playwright: `supabase-auth` ✓ · `supabase-smoke` ✓ (unchanged UX, no console/page errors)
- Secret scans: no `.env*` staged; **client bundle 0×** for `OPENAI_API_KEY`,
  `requireOpenAIConfig`, `SupabaseGenerationGateway`/`composeServerPrompt`, the OpenAI SDK
  (`images/edits`) and `sharp` (server build references the key 4×, as expected).

## Exact remaining owner actions before the first paid request

1. Confirm OpenAI **billing** is active + any required **organization verification** for
   image models.
2. Put the key in **`.env.local`** (never in chat): `OPENAI_API_KEY=sk-…`
3. Add the same `OPENAI_API_KEY` to the **Vercel** project (server-only, never `NEXT_PUBLIC_`).
4. Set `IMAGE_GENERATION_PROVIDER=openai` (optionally `OPENAI_IMAGE_MODEL`,
   `OPENAI_IMAGE_QUALITY=medium`, `OPENAI_IMAGE_OUTPUT_FORMAT=webp`, `OPENAI_MAX_INPUT_PRODUCTS=1`
   for the first test).
5. Wire the Home "Generate" action to call `requestOpenAIGeneration(...)` (the IDs-only
   client) for the first controlled run — **one location, one product, one logo** — then
   report actual usage + cost from the result's `provider_metadata` (key never exposed).

## Notes / remaining

- The `SupabaseGenerationGateway` is integration code verified by the build + the owner's
  first run (it cannot be unit-tested without a live Supabase). The security/lifecycle
  logic it feeds is fully unit-tested via the injectable fake gateway.
- Wiring the Home UI to the IDs-only endpoint (in place of the mock) is the only remaining
  switch, intentionally left for the gated first paid test.
