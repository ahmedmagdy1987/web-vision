# Phase 3.4 — Malahi-branded simplified mockup generator (review)

A deliberate product-direction correction: Web Vision was technically strong but
operationally overcomplicated — it read like a generic multi-tenant creative SaaS.
The real product is a **simple internal Malahi tool** for producing realistic
product-placement mockups. This phase re-skins and simplifies the app around that
goal **without touching the verified cloud foundation** (Supabase Auth, RLS,
private Storage, tables, repositories, the image-adapter seam) and **without
integrating a real image provider** (generation stays mocked until Phase 4).

> This is a **simplified visual-review candidate**, not production-ready. It has
> not been merged to `main` or redeployed. Image generation remains mocked.

## Product concepts removed from the UI

- **Projects** — removed from primary nav, the header, global search, and the
  asset-library filters (Products/Gallery). The generation workflow never asks for
  a project. Project relations are **preserved in the data model**; they are simply
  no longer required or shown in the normal UI.
- **Workspace / Organization** — no workspace/org selector appears anywhere in the
  normal UI. The single hidden Malahi operational org is selected automatically
  (first membership) exactly as before; the account menu shows a static "· Malahi".
- **Studio** — removed from primary navigation and the header CTA. The full
  workflow now lives on Home. `/studio` redirects to `/` so old links/prefill
  handoffs keep working.

## New navigation

Primary nav (sidebar + mobile bottom nav, single source `nav-config.ts`):

> **Home · Logos · Products · Locations · Gallery**

The header keeps only the brand mark (mobile), global search, theme toggle and the
account menu — no project selector, no Studio button.

## Home generation workflow

`src/components/home/home-generator.tsx` hosts the **complete** workflow. The
employee picks assets and a few simple options, then clicks **Generate Mockup**:

1. **Logo** — a flat logo library across all active brands (pick directly).
2. **Products** — multi-select of the chosen logo's brand products (all active, no
   project gating).
3. **Location** — pick an existing site **or upload a new one inline**.
4. **Style** (preset), **Position** (Auto/Center/Left/Right), **Aspect ratio**, and
   optional **Notes** — the visible options are intentionally limited.
5. **Generate Mockup** validates, builds the hidden structured request, creates the
   `GenerationJob`, opens the generation-progress view (the reused "cooking"
   animation with simple copy — *Preparing assets → Understanding the location →
   Positioning products → Applying the logo → Finalizing the mockup*), runs the
   existing `MockImageAdapter`, saves the result, and opens the Gallery result.

Responsive: on mobile the generator is the priority — order is Logo, Products,
Location, Style, Position, Aspect ratio, Notes, Generate Mockup, with no metric
cards before the generator and the live preview hidden until desktop.

## Malahi branding

- A crafted **Malahi ferris-wheel mark** (`MalahiMark`) appears in the app shell
  (sidebar + mobile header), the sign-in/auth screens, the favicon (`icon.svg`) and
  the apple-touch icon. The wordmark reads **"Malahi · Mockup Studio"**.
- The "generic purple SaaS" look is gone: the single `--brand` token was re-hued
  from violet to a **Malahi teal** (`oklch(0.6 0.1 190)`; hex `#0d9488`), which
  cascades to buttons, focus rings, active nav, badges and the hero/cooking
  gradients. Hardcoded `#6d28d9`/`#6366f1`/indigo literals (icon, apple-icon,
  manifest, viewport theme color, placeholders, default accent, cooking overlay)
  were replaced with the Malahi teal. The per-brand global accent override was
  removed so the shell stays unmistakably Malahi.
- Metadata/manifest/titles renamed from "Web Vision" to **"Malahi"**.

> **Note:** the shell mark is a *crafted* brand mark for this review candidate. Drop
> the official Malahi logo at `public/malahi-logo.svg` (and regenerate `icon.svg` /
> `apple-icon.tsx`) to replace it — a one-file swap. (The "Malahi" logos shown
> inside the Logo Library and mockups are the team's real uploaded brand assets.)

## Logos, Products & Locations

- **Identity → Logo Library:** the Identity page is relabeled "Logo Library"
  ("Logos" in nav); page header, search ("Search logos…") and empty states use
  logo-library wording. The project filter was removed. The backend entity is
  unchanged — brands/`brand_assets`, the `Brand`/`LogoAsset` domain types and
  `BrandRepositoryApi` are untouched; "Logos" is purely a presentation skin.
- **Products:** project filter removed; defaults to all active products. Upload/edit
  flows unchanged.
- **Locations:** now defaults to **all locations** (the project-scoped default and
  the scope selector were removed); inline upload preserved.

## Hidden instruction-composer changes

`src/lib/services/instruction-composer.ts` keeps the structured-prompt-in-a-string
seam (the adapter still receives only `instructions.text`), so the enrichment is
provider-ready with no adapter/caller changes. The employee still chooses only a
few options; the composer now expands them into sophisticated instructions:

- **System** identity rewritten to the Malahi engine.
- **Composition & style** section: each style preset → a detailed visual
  instruction (`VISUAL_STYLE_GUIDANCE`); Auto/Center/Left/Right → strong spatial
  composition guidance (`PLACEMENT_GUIDANCE`, not naive pixel positioning); plus
  lighting/camera/scale/people/creativity guidance.
- **Preservation & safety** section (permanent, non-negotiable): full location/scene
  preservation (architecture, walls, ceiling, flooring, windows, doors, signage,
  structure, camera position, perspective, FOV; no redesign/replace; remove objects
  only when requested), product preservation (exact form/geometry/proportions/
  material/color/branding; no substitute/merge/duplicate; use all references),
  realistic placement (believable scale, floor plane, contact shadows, lighting
  match, occlusion, no floating/intersecting), and logo integrity (no rewrite/
  rotate/mirror/distort/crop; suitable surfaces only; no duplicate applications).
- **Employee notes** are appended **after** the permanent preservation rules with an
  explicit guard so notes refine but never override the preservation/safety
  constraints.

`#fail` injection and deterministic seeds are preserved; `getImageAdapter()` still
returns the `MockImageAdapter`.

## Preserved backend entities

Untouched: Supabase Auth, profiles/membership, the hidden org boundary, RLS,
private Storage + signed URLs, the brands/`brand_assets`/products/locations/jobs/
`generation_results` tables, repository abstractions, the `ImageGenerationAdapter`
seam, Gallery persistence and review/favorite state. **No migrations** were added.
No reset/reseed; no production data deleted; no new Supabase/Vercel project.

## Tests & exact results

- `npm run typecheck` → **pass** (0 errors)
- `npm run lint` → **pass** (0 errors, 0 warnings)
- `npm run test:unit` → **37 passed / 37**
- `npm run build` → **pass** (Turbopack, all routes)
- Playwright (live Supabase, `next start` on :3210) — **5 passed**:
  - `supabase-auth`: unauthenticated → `/sign-in`; sign in → app → protected nav →
    sign out.
  - `supabase-smoke`: no console/page errors and no horizontal overflow across `/`,
    `/identity`, `/products`, `/locations`, `/gallery` on desktop/laptop/tablet/mobile.
  - `phase34-screenshots`: desktop + mobile capture (12/12).

## Screenshots

`artifacts/web-vision-phase-3-4-simplified/` (real Malahi shell branding + existing
live assets):

| File | Screen |
|---|---|
| 01-home-generator-desktop.png | Home generator |
| 02-logo-picker-desktop.png | Logo picker |
| 03-product-picker-desktop.png | Product picker |
| 04-location-picker-desktop.png | Location picker |
| 05-logos-library-desktop.png | Logo Library |
| 06-products-library-desktop.png | Products |
| 07-locations-library-desktop.png | Locations |
| 08-generation-progress-desktop.png | Generation progress ("cooking") |
| 09-gallery-desktop.png | Gallery |
| 10-home-generator-mobile.png | Home generator (mobile) |
| 11-asset-picker-mobile.png | Asset picker (mobile) |
| 12-generation-progress-mobile.png | Generation progress (mobile) |

## Remaining limitations

- **Image generation remains mocked** (`MockImageAdapter`) — no real provider is
  integrated; deferred to Phase 4 until this simplified experience is approved.
- The shell logo is a **crafted Malahi mark** pending the official asset (one-file
  swap at `public/malahi-logo.svg`).
- Legacy Home-dashboard and Studio components are retired (no longer rendered) but
  left in the tree; they can be deleted in a follow-up.
- Not production-ready; not merged to `main`; production deployment unchanged.
