# Phase 3.4.3B — Generation-failure diagnosis + compact asset selection

Baseline `c5129ff`. No paid OpenAI request made; no merge/redeploy.

## Diagnosis of the 502 (read-only, no OpenAI calls)

Evidence from the persisted state + free reproduction of the non-OpenAI stages:

- **generation_jobs:** the openai attempt is `status=failed`, `error_code=PROVIDER_ERROR`,
  `error_message="Image generation failed."` (the old code collapsed the real cause),
  **no `provider_job_id`**, no `completed_at`.
- **generation_results / Storage:** no result row and no new result object for the
  failed job.
- **Asset resolution (reproduced, free):** logo `image/png` 250×132, product
  `SLUSH MACHINE` `image/png` 174×292, location `test` `image/jpeg` 387×516 — **all
  download + decode fine**.
- **sharp post-process (reproduced, free):** OK (1024×1536 → 1024×1280).

Because a `failed` job exists, the run got past asset resolution + `createJob` to the
**provider call** (assets + sharp + upload reproduce healthy, so the failure is the
OpenAI Images Edit call itself). No usable image was returned (healthy downstream would
otherwise have produced a result), the request id + usage were not captured, and no
result/storage object exists.

**Outcome:** OpenAI was reached and the request failed at the provider call. **Cost
most likely none** — a provider-side rejection (4xx: model access / parameter / billing)
returns no image and does not charge; the absence of any returned image, request id,
usage, result row, or storage object is consistent with a pre-generation rejection. It
cannot be 100% confirmed from the old (collapsed) evidence — which is exactly what the
error-reporting fix below now captures on any future attempt. **Leading candidate:**
OpenAI image-model access for `gpt-image-2` on this API project (to be confirmed by the
new specific error code on the next, approved attempt).

## Fixes

- **Safe error classification:** `classifyProviderError` maps the OpenAI SDK
  status/code/type to specific codes — `OPENAI_MODEL_ACCESS_DENIED`,
  `OPENAI_BILLING_REQUIRED`, `OPENAI_INVALID_REQUEST`, `OPENAI_CONTENT_POLICY`,
  `OPENAI_TIMEOUT` — and the orchestrator classifies each stage
  (`ASSET_IMAGE_UNAVAILABLE`, `IMAGE_POST_PROCESSING_FAILED`, `RESULT_STORAGE_FAILED`,
  `RESULT_PERSISTENCE_FAILED`). The job stores the specific code + a safe message; the
  route returns `{ error, code, retryable }`. Sensitive detail stays server-side (no
  key, headers, signed URLs, storage paths or raw responses).
- **Actionable UI + Try again:** Home shows the safe message and a non-destructive
  **Try again** ONLY for retryable codes (timeout / post-process / storage / persistence
  / transient). 4xx, billing, validation, content-policy and asset errors are **not**
  retryable and never auto-retry. A new attempt uses a fresh idempotency key.
- **Compact Location tile:** the selected Location is now an ~80 px square tile
  (thumbnail + name + Change + Remove), consistent with Logo + Products.
- **Result-only large area:** the large right area is reserved for the GENERATED result
  — before generation it shows an empty "Your generated mockup will appear here." canvas
  + a compact "Selected for this mockup" summary; during generation it shows the
  animation; on success it navigates to the Gallery detail (object-contain, real aspect,
  uncropped, downloadable). The source Location is never presented as the final mockup.

## Tests & results

`typecheck` ✓ · `lint` ✓ (0) · `test:unit` **80 passed** (+16: classifier codes,
4xx-no-retry, timeout, post-process/storage/persistence/asset failures, idempotency,
no-duplicate-paid-call, safe messages never contain a key) · `build` ✓ ·
`supabase-auth` ✓ · `supabase-smoke` ✓ · `phase343b` UI ✓ (compact selection + result
area, zero console errors) · client-bundle scan: 0× for key / `requireOpenAIConfig` /
`classifyProviderError` / `SupabaseGenerationGateway` / SDK / sharp.

Assets preserved + still accessible: **Malahi Arcade** logo, **SLUSH MACHINE** product,
**test** location.

Screenshots: `01-home-compact-selection-desktop.png`, `02-home-compact-selection-mobile.png`.
