# Phase 3.4.1 — Official Malahi branding & simplified-UX correction (review)

The Phase 3.4 direction is accepted conceptually but was not visually approved.
This focused pass corrects the two main issues — the **invented logo** and the
**asset-selection UX** — and tightens the simplified Malahi experience. Backend
foundation, data, Gallery history, the `MockImageAdapter` and the Vercel
production deployment are untouched.

> **Ready for visual review.** Not production-ready; not merged to `main`; no
> production redeploy; no real image provider; no production release tag.

## 1. Invented logo removed

The crafted **ferris-wheel mark was removed everywhere**: the app shell, the
sign-in / pending-access screens, the favicon (`src/app/icon.svg`), the apple
touch icon (`src/app/apple-icon.tsx`), the manifest icon and `public/malahi-logo.svg`.
A grep confirms no `MalahiMark`/`Aperture` references remain.

**Was an official Malahi logo found?** No. I searched the repository, `public/`,
the home/recovery directory and the Supabase brand assets. The only logos present
are **client/mockup brand logos** (e.g. the "Malahi Arcade" logo) — these are *not*
the application's official identity and are deliberately **not** used as the app
logo. No verified official Malahi app logo exists.

**Temporary branding used:** a clean **text-only "Malahi" wordmark** (in the
Malahi teal) with a "Mockup Generator" subtitle in the shell and auth screens. The
favicon is a temporary "M" lettermark on teal; the apple icon is a plain teal tile.
No icon/symbol was invented and no substitute logo was created.

**Where the official asset goes:** drop the official Malahi logo at
**`public/malahi-logo.svg`**, then reintroduce it in `src/components/layout/app-logo.tsx`,
`src/app/icon.svg` and `src/app/apple-icon.tsx`. (A code note marks each location.)

## 2. Direct upload + visual selection on Home

Every asset section on Home now supports **select existing + upload new + thumbnail
preview + remove/replace**, via visual picker **sheets** (no plain-text dropdowns):

- **Logo** — "Choose logo" opens a thumbnail sheet (search + Upload logo + empty
  state); "Upload logo" opens a one-step dialog (image + name → the backend brand
  container is created transparently). Selected state shows the logo thumbnail +
  Change/Remove.
- **Products** — "Add products" opens a multi-select thumbnail sheet (search +
  Upload product + empty state). Selected products render as thumbnails on Home,
  each individually removable.
- **Location** — "Choose location" opens a thumbnail sheet (search + Upload location
  + empty state); "Upload location" opens the full location dialog. The selected
  location shows a **large 16:9 scene preview** + Change/Remove.

Each picker tile shows a thumbnail, name, selected check and an upload action. The
employee never has to leave Home to add the first asset. The full library pages
remain for advanced management.

New: `src/components/home/asset-picker-sheet.tsx`, `src/components/home/logo-upload-dialog.tsx`;
`home-generator.tsx` rewritten around them.

## 3. Logo Library (not a renamed Identity page)

`/logos` is a **flat logo grid** (`src/components/logos/logos-view.tsx`). Each item
shows the **logo image, name, type (Primary/light/dark), default marker, edit and
archive**. The primary action is **Upload logo**. Removed: accent palette, brand
description, instructions status, product/location counts, current-brand identity
summary, identity readiness and all "Manage Identity" wording. Advanced per-logo
instructions stay hidden behind the edit dialog. The backend brand/`brand_assets`
mapping is preserved; uploading a logo does not require building a Brand entity.

## 4. Routes & terminology

- New route **`/logos`**; `/identity` redirects to it.
- Removed user-facing exposure of **Studio** (gallery empty state, "Open/Use in
  Studio" → "Use in mockup", product toast, result-detail), **Project** (gallery
  result-detail context, Products/Gallery filters), **Composed instructions /
  generation request** (the gallery instructions viewer was removed), **Identity**,
  **Workspace/Organization/Tenant** and **Current brand / Brand readiness**.
  Backend/architecture references (e.g. `organization_id`) remain only in
  non-rendered code, as allowed.

## Visual identity

Internal-tool styling on the verified Malahi teal: neutral surfaces, restrained
primary color, strong image previews (large location scene preview, logo on a
transparency checkerboard), no over-decoration. The selected logo inside a
generation stays separate from the permanent (text wordmark) application identity.

## Tests & exact results

- `typecheck` → **pass** (0 errors) · `lint` → **pass** (0 errors, 0 warnings)
- `test:unit` → **37 passed / 37** · `build` → **pass** (Turbopack, all routes)
- Playwright (live Supabase, `next start` :3210):
  - `supabase-auth` — redirect + sign-in/nav/sign-out → **pass**
  - `supabase-smoke` — no console/page errors, no overflow across `/`, `/logos`,
    `/products`, `/locations`, `/gallery` on desktop/laptop/tablet/mobile → **pass**
  - `phase341-screenshots` — desktop + mobile → **pass** (12/12; the mobile run
    flaked once on a transient sign-in rate-limit and passed on a clean re-run)

## Screenshots — `artifacts/web-vision-phase-3-4-1-review/`

01-home-generator-desktop · 02-home-logo-picker-desktop · 03-home-product-picker-desktop ·
04-home-location-picker-desktop · 05-logos-library-desktop · 06-products-library-desktop ·
07-locations-library-desktop · 08-generation-progress-desktop · 09-gallery-desktop ·
10-home-generator-mobile · 11-home-product-picker-mobile · 12-generation-progress-mobile

They show: no invented Malahi symbol (text wordmark), the simple Home workflow,
direct upload actions for all three asset types, visual picker sheets, no
Project/Workspace/Identity complexity, real uploaded assets, and desktop + mobile.

## Remaining visual limitations

- **The official Malahi logo asset is still required** — the shell currently uses a
  temporary text wordmark (swap target: `public/malahi-logo.svg`).
- **Image generation remains mocked** (`MockImageAdapter`) — no real provider.
- Legacy Phase ≤3.4 dashboard/Studio/Identity components remain in the tree but are
  no longer rendered; they can be deleted in a follow-up.
- Backend entities still carry "brand"/"organization" naming internally (not
  user-facing), preserved for compatibility.
