# Phase 3.4.3D — Gallery crash fix + instant result refresh

Baseline `2876926`. No OpenAI request made; no new job; no merge/redeploy. Uses the
existing successful gpt-image-2 result only.

## 1. Exact root cause

The Gallery crashed in `hexToRgb()` (`hex.replace(...)`) via
`ResultCard → readableForeground(snapshot.brandAccent)`. Comparing the persisted
snapshots (read-only):

- **OpenAI result** snapshot keys: `brandId, locationId, logoId, productIds, settings`
  → **`brandAccent` is `undefined`** (also `brandName`, `productNames`, `locationName`).
- **Mock result** snapshot keys also include `brandAccent ("#7c3aed"), brandName,
  productNames, locationName, instructions`.

`ResultCard` assumed those fields exist — `readableForeground(undefined)` →
`undefined.replace(...)`, and would next have hit `snapshot.brandName.slice(...)` and
`summarizeNames(snapshot.productNames)`. **Origin: the server-side OpenAI result
writer (`SupabaseGenerationGateway.persistResult`) stored a minimal snapshot.** It was
NOT a theme bug, a DB-mapping bug, or a legacy-record issue alone — the writer omitted
display fields, and the mapper + card had no normalization/fallback.

## 2. Theme color utilities — null-safe (final boundary)

`hexToRgb` now returns `null` (never `.replace`) for `undefined / null / "" / blank /
invalid` hex, still parses 3- and 6-digit hex. `readableForeground` tolerates absent/
invalid colors (returns white). Added `safeAccent()` → the record's accent if valid,
else the Malahi default `#0d9488`. No broad try/catch.

## 3. Repository/domain normalization (upstream fix)

`resultFromRow` now runs every stored snapshot through `normalizeResultSnapshot()`, so
**old mock, new OpenAI, legacy-incomplete and future records all map to one consistent
domain shape**: a valid `brandAccent` (fallback `safeAccent`), `brandName` ("Mockup"
fallback), `productIds`/`productNames` as arrays, default settings/instructions. The
selected logo/products/location, provider metadata, review status, favorite and
dimensions are preserved. `ResultCard` stays presentation-only — no DB-shape knowledge.
**No backfill is required** — existing incomplete records render safely.

## 4. Result writer corrected (future records)

`persistResult` now reads the brand (name + accent), product names and location name
and stores them in the snapshot, so **future** OpenAI results carry full display data.
(The one pre-fix record renders safely via the mapper with fallback names — verified,
not modified, per the read-only instruction.)

## 5. Card-level resilience

`ResultCardBoundary` wraps every grid/list card: one malformed result renders a safe
fallback card instead of blanking the page; the error is logged in dev only (no
secrets). The whole Gallery is never replaced by a generic error screen for a missing
accent.

## 6. Instant refresh + refetch-failure handling

After a successful server-side OpenAI generation the Home flow calls
`resultRepository.refresh()` (reloads the authoritative collection from Supabase) and
navigates to `/gallery/<id>` — **no fake client result, no duplicate, Supabase stays
the source of truth**, and a full browser refresh preserves it. If the refetch fails,
the result is **not** marked failed and OpenAI is **not** called again; the UI shows
*"Your mockup was generated and saved, but the latest result could not be refreshed."*
with **Open result** + **Refresh Gallery**.

## 7. Existing result verified (read-only)

job `completed` · result exists · provider `openai` · model `gpt-image-2` · quality
`medium` · fidelity `automatic-high` · aspect `4:5` · **1024×1280** · `image/webp` ·
private Storage object accessible · snapshot reference IDs (brand/logo/products/location)
present · **renders in Gallery and Gallery Detail without crashing**.

## 8. Display

Gallery cards stay square (`object-fit: cover`) and never crash on absent accent. The
**Mock result** badge shows only for mock (SVG) results — the **real OpenAI result has
no Mock badge** (verified in screenshots). Gallery Detail shows the real image at its
original 4:5 ratio (`object-fit: contain`, uncropped) and preserves Download, Approve,
Reject, Favorite, Regenerate, Create variation + Duplicate setup.

## Tests & results

`typecheck` ✓ · `lint` ✓ (0) · `test:unit` **90 passed** (+8: hexToRgb null/garbage
safety, invalid→fallback, incomplete & full snapshot normalization, OpenAI + mock rows
both map without the crash) · `build` ✓ · `supabase-auth` + `supabase-smoke` ✓ ·
`phase343d` gallery+detail (desktop+mobile) ✓ — **asserts no `'replace'` crash**.
Client-bundle secret scan clean (unchanged generation server modules). The runtime
error `Cannot read properties of undefined (reading 'replace')` is **gone**.

## Screenshots — `artifacts/web-vision-phase-3-4-3d-gallery-fix/`

01-gallery-with-real-openai-result-desktop · 02-openai-result-detail-desktop ·
03-openai-result-original-ratio-desktop · 04-gallery-with-real-result-mobile ·
05-openai-result-detail-mobile

## Remaining blockers before merge + Vercel deploy

- The pre-fix OpenAI record shows fallback display names ("Mockup" / "No products");
  future records carry full names. A one-time non-destructive snapshot completion of
  that single record is optional (intentionally skipped — read-only verification).
- The OpenAI provider key must be added to **Vercel** env (server-only) before a
  production deploy; production still runs the mock provider until then.
- Legacy unrendered ≤3.4 components remain for a later deletion pass.
