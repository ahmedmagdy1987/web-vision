# Phase 3.4.3 — Final UX cleanup & OpenAI GPT Image 2 provider foundation

Branch `phase-3-4-3-final-polish-openai-foundation` (child of 3.4.2 `b5cc872`).
No backend data reset, no reseed, no production redeploy. Image generation stays
on the **mock** provider — the OpenAI path is scaffolded + tested but makes **no
paid call** until the owner configures billing and the key (see §11).

> **Ready for visual review.** Not merged to `main`; production not redeployed;
> no release tag; OpenAI provider gated behind the owner's key.

## 1. Product form simplification

`Add Product` now contains only **Product name + Main product image** (both
required) and optional additional reference images. The employee **never picks a
logo** — the owning logo/brand is assigned internally (the selected logo's brand,
or the first active one). Category, usage, dimensions, description and preservation
notes moved into a collapsed **"Advanced details — optional"** disclosure. The
dialog has a scroll body + a **sticky Cancel / Save Product footer** and becomes a
**full-screen sheet on small mobile screens**. Image previews, progress and errors
come from the shared `ImageDropzone`. The same simplicity was applied to **Upload
Location** (Name + scene photos required; environment/notes/preservation in
Advanced); **Upload Logo** was already Name + Image.

## 2. Accessibility / focus fix

Root cause of `Blocked aria-hidden … descendant retained focus`: the Home picker
**Sheet** opened an upload **Dialog** while still mounted — two stacked Radix
Dialog layers, the inner one's autofocus landing inside the subtree the outer
layer marked `aria-hidden`. Fix: the picker sheet now **closes when its upload
dialog opens**, so only one modal layer is mounted. Focus returns to the trigger
on close (Radix default, now uncontested). The Playwright run opens + closes every
upload dialog and **asserts zero aria-hidden warnings**.

## 3. Scrollbar implementation

A restrained Malahi scrollbar system in `globals.css` (`@layer utilities`, applied
app-wide via `*`): **Firefox** `scrollbar-width: thin` + `scrollbar-color`;
**Chromium/WebKit** `::-webkit-scrollbar` — a slim (~4px) rounded thumb on a
neutral transparent track that turns **Malahi teal on hover/active**. Light + dark
adapt via `--border` / `--brand`. Scrollbars are never fully hidden.

## 4. Logo deletion behavior

Each logo's action menu offers **Edit / Replace image / Set as default / Archive /
Delete**. **Delete** opens a confirmation showing the **logo thumbnail + name**:
- **Unreferenced** logo (not used by any Gallery result) → permanently deleted:
  the `brand_assets` record **and** the private Storage object are removed
  (`brandRepository.removeLogo`, best-effort cleanup if one step fails).
- **Referenced** logo → permanent delete is unavailable (it would break Gallery
  history); the dialog explains this and offers **"Remove from active library"**,
  which archives it (hidden from new-generation pickers, history preserved).

Reference detection uses `resultRepository` results' `snapshot.logoId`. Products
keep archive/restore; locations' archive plumbing is a noted follow-up.

## 5. Gallery filters + square images

- **Sort** is now one clean control — removed the duplicated arrow icon that
  overlapped the Select's chevron (desktop + mobile). Filters stay an aligned grid;
  mobile keeps the bottom-sheet + chips.
- **Square (1:1) thumbnails** everywhere: product cards, location cards, **gallery
  result cards** (square even for portrait/landscape results), the Home
  selected-location tile. Photos use `object-cover`; logos use `object-contain`
  (logo cards + `contain` picker tiles). Consistent square skeleton + the
  "No image uploaded" fallback — no broken-image icons.
- Clicking a gallery card opens the **detail page**, which renders the **original
  uncropped image** at its natural aspect ratio (`object-contain`) with Download.

## 6. Gallery card cleanup

Cards show exactly one intentional **"Mock result"** badge plus square thumbnail,
review status, favorite, logo name, product names, location and creation date — no
project metadata, debug/provider labels, duplicated badges or overlapping text.

## 7. Sign-in redesign

A composed **split layout**: a fixed light, teal-tinted **brand panel** (logo +
"Malahi Mockup Generator" + "Create realistic branded product placements for client
locations." + a secondary invite-only note) beside a clean form (email, password,
show-password, forgot-password, Sign in). Mobile collapses to a single column
(compact brand header + form, no unnecessary scroll). All existing auth, recovery,
callback, pending-access and sign-out behavior is unchanged.

## 8. Dark-mode logo treatment

The floating white **pill is gone**. The navy PNG is rendered as-is (no recolor /
no CSS filter); for dark-mode contrast the **sidebar header is an integrated
full-width light brand band**, with small light plaques on the mobile header /
loading state and the always-light auth brand panel. No stretching, cropping or
recoloring; readable in light and dark. The application logo stays distinct from
client/mockup logos.

## 9. OpenAI adapter architecture

- **Interface preserved.** `ImageGenerationAdapter` + the Mock adapter are intact;
  `ImageGenerationParams` gained optional `referenceImages` (location base, product
  mains, logo). The mock ignores them.
- **Server-only call.** The API key lives only in `src/app/api/generate-image/route.ts`
  and `openai-server.ts` (`import "server-only"`). The **client `OpenAIImageAdapter`
  posts reference image URLs to the route** and never sees the key. Client-bundle
  scan: `OPENAI_API_KEY` / `requireOpenAIConfig` / the SDK appear **0×** in
  `.next/static`.
- **Explicit selection, no silent fallback.** `getImageProvider()` reads
  `IMAGE_GENERATION_PROVIDER` (mock | openai); an unknown value throws; choosing
  `openai` with no key makes the route return an error (it never falls back to mock).
- **GPT Image 2 edit flow** (the request contains images). Deterministic input
  ordering: location (base) → products → logo, with a configurable reference limit.
  Size mapping: 1:1→1024², 4:5→1024×1280, 16:9→1536×864, 9:16→864×1536. Defaults:
  quality `medium`, n `1`, no partial streaming, `background: auto`, WebP output.
  Bounded retries + per-attempt timeout + abort support; OpenAI request id captured;
  internal cost estimate helper (admin metadata only). The hidden instruction
  composer's preservation rules (location/architecture/perspective, product
  geometry, realistic placement/shadows/occlusion, logo lettering, notes secondary)
  are fed as the prompt and never shown to employees.
- **Persistence.** The generation service now threads the real image **mime type**
  (PNG/WebP, no longer hard-coded SVG) and reference images through the existing job
  → queued → processing → completed/failed lifecycle and Storage upload. (Tagging
  the Supabase job/result rows with provider/model/cost columns is a small noted
  follow-up done together with the first live wiring.)
- **Env contract** added to `.env.example`: `IMAGE_GENERATION_PROVIDER`,
  `NEXT_PUBLIC_IMAGE_GENERATION_PROVIDER`, `OPENAI_API_KEY` (blank), `OPENAI_IMAGE_MODEL`,
  `OPENAI_IMAGE_QUALITY`, `OPENAI_IMAGE_OUTPUT_FORMAT`, `OPENAI_IMAGE_REFERENCE_LIMIT`.
  No real key in Git; key never `NEXT_PUBLIC_`.

## Tests & exact results

- `typecheck` ✓ (0) · `lint` ✓ (0) · `build` ✓
- `test:unit` → **51 passed / 51** (37 prior + **14 new** OpenAI-foundation tests:
  provider selection / no silent fallback, size mapping, input ordering + required-
  image validation, mocked-client success, no-image error, OpenAI error, transient
  retry, retry bound, abort, config helpers)
- Playwright (live Supabase): `supabase-auth` ✓ · `supabase-smoke` ✓ (no console/
  page errors, no overflow) · `phase343-screenshots` ✓ — **zero aria-hidden
  warnings** asserted while opening/closing every upload dialog
- Secret scans: no `.env*` staged; **client bundle has no API key / server module /
  SDK** (`.next/static` 0 matches — the one `sk-` hit is Tailwind `mask-image-*`)

## Screenshots — `artifacts/web-vision-phase-3-4-3/`

01-add-product-simple-desktop · 02-add-product-advanced-collapsed ·
03-logo-delete-confirmation · 04-gallery-filters-desktop ·
05-gallery-square-cards-desktop · 06-gallery-original-image-detail ·
07-sign-in-light-desktop · 08-sign-in-dark-desktop · 09-shell-logo-dark-desktop ·
10-add-product-mobile · 11-gallery-mobile

## 11. Owner actions required before the first paid OpenAI test

1. Confirm OpenAI **billing** is active and complete any required **organization
   verification** for image models.
2. Add the key **locally** to `.env.local` (never paste it into chat):
   `OPENAI_API_KEY=sk-…`
3. Add the same `OPENAI_API_KEY` to the **Vercel** project's Environment Variables
   (Production/Preview as desired) — server-only, never `NEXT_PUBLIC_`.
4. Set the provider to OpenAI in both env files:
   `IMAGE_GENERATION_PROVIDER=openai` and `NEXT_PUBLIC_IMAGE_GENERATION_PROVIDER=openai`
   (optionally `OPENAI_IMAGE_MODEL` / `OPENAI_IMAGE_QUALITY` / `OPENAI_IMAGE_OUTPUT_FORMAT`).
5. Then run **exactly one** controlled medium-quality test with one location, one
   product and one logo. Actual usage + estimated cost are reported without exposing
   the key.

## Remaining limitations

- Image generation is still **mock** until the owner enables the key.
- Supabase job/result provider-tagging columns + the location archive UI are small
  documented follow-ups.
- A dedicated **square app-icon** version of the Malahi logo is still wanted.
