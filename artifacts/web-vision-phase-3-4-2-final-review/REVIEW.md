# Phase 3.4.2 — Final simplified-workflow & asset-preview polish (review)

A focused UX/visual polish pass on top of the accepted 3.4.1 branding work. No
backend, RLS, storage, data or production changes. The official Malahi logo from
3.4.1 (`public/malahi-logo.png`) is unchanged.

> **Ready for visual review.** Not merged to `main`; production not redeployed;
> image generation still mocked; no release tag.

## 1. Product-selection dependency removed

Home no longer forces an order. "Choose a logo first" and the disabled product
control are gone — **logo, products and location can be selected in any order**:

- The product picker now offers **all active products** (not scoped to the logo's
  brand), so products can be chosen before a logo.
- Changing or removing the logo **no longer clears products or location** — a new
  reducer action `select-logo` sets the logo (and its brand) without resetting
  selections (the old `set-brand` reset path is no longer used by Home).
- **Generate** validates that a logo, ≥1 product and a location are all present.
- The internal brand mapping is resolved silently: the composer's brand is the
  logo's brand; products may belong to any brand. Product upload defaults its
  (internal) brand to the logo's brand, or the first active one when no logo is set
  — so "Add product" works before a logo is chosen, with no brand friction exposed.

## 2. Root cause of missing/broken thumbnails — fixed

**Root cause:** two things. (a) `AssetImage` had **no `onError` handler**, so any
missing or **expired signed URL** fell through to the browser's broken-image icon.
(b) The live seed **products and locations have no uploaded image** (binary assets
are created at runtime, not seeded), so most tiles had no `src` at all and rendered
a bare grey box.

**Fix (`AssetImage`):**
- On load error (e.g. an expired signed URL) it now swaps to a **clean fallback**
  instead of the broken-image icon; the error state resets when the `src` changes
  (so a refreshed URL re-renders).
- The fallback is a **professional, labeled placeholder** — a relevant icon
  (Package for products, MapPin for locations) + **"No image uploaded"** on a
  neutral surface, filling the container so the **ratio is preserved**, visually
  distinct from a loading state, and never resembling a failed request.
- Real uploaded images still render whenever present; the correct primary image
  (`mainImage`) is used. No fake product photography was invented.

Wired into the product/location cards, the Home picker sheets, the Home selected
thumbnails and the desktop preview.

## 3. Home selected-state improvements

- **Logo:** thumbnail + name + Change + Remove.
- **Products:** all selected thumbnails + names + per-item remove, a **"N selected"
  count**, and **"Add more products"**.
- **Location:** large scene preview (or "No image uploaded" fallback) + name +
  Change + Remove.
- **Desktop two-column layout:** the left column is the workflow (pickers + Style /
  Position / Aspect ratio / Notes / Generate); the right column is a **clean visual
  summary** ("Your mockup") composing the location preview with the logo chip and
  product thumbnails — so the employee sees the whole setup without reopening a
  picker. No dashboards, stats or readiness panels. The empty state stays compact;
  the summary column is desktop-only (mobile shows the selected state inline).

## 4. Aspect-ratio labels

Now explicit: **Portrait · 4:5 · Square · 1:1 · Wide · 16:9 · Story · 9:16**. The
stored values (`4:5`, `1:1`, `16:9`, `9:16`) and generated dimensions are unchanged
and match the labels. No new ratios added.

## 5. Legacy terminology removed (rendered app)

- Gallery **result cards** no longer show the **"General" project** metadata or the
  technical visualization/aspect badges; they now show logo, products, location,
  **review state, created date, favorite**, plus an intentional **"Mock result"**
  label (designed, not clipped).
- Filters relabeled: **Brand → Logo**, **All brands → All logos** (gallery + product
  filters, and the product-upload field). Result detail's project context was
  already removed in 3.4.1.
- A scan of the rendered app shows no user-facing **General / Project / Workspace /
  Organization / Identity / Studio / Current brand / Brand readiness**. The only
  remaining occurrences are in **unrendered legacy components** (StudioWorkspace,
  quick-start-card, project-selector, identity-summary, brand-manager-sheet) that no
  route mounts; backend table/repository names are unchanged as allowed.

## 6. Product filters

Search stays prominent; the **Brand** facet is now **Logo**. Category / Status /
Usage remain available. (Secondary filters were kept inline but de-emphasized; a
collapsible grouping is a possible further simplification.)

## 7. Gallery card cleanup

See §5 — project metadata, clipped badges and technical labels removed; broken-image
states replaced by the §2 fallback; cards emphasize result / logo / products /
location / review / date / favorite with a tidy "Mock result" label.

## 8. Official logo — visual verification (no rework)

Verified unchanged and correct in **desktop light, desktop dark, mobile header,
sign-in and loading**: no stretching, no clipping, no oversized white container,
adequate clear space; the navy logo sits on a neutral white container only in dark
mode. The permanent Malahi application logo stays clearly separate from the client
logos employees pick for mockups. The temporary neutral favicon remains (a dedicated
square official icon is still needed).

## Tests & exact results

- `typecheck` ✓ (0) · `lint` ✓ (0) · `test:unit` **37/37** · `build` ✓
- Playwright (live Supabase, `next start` :3210):
  - `supabase-auth` ✓ · `supabase-smoke` ✓ (**no console/page errors, no overflow**
    across `/`, `/logos`, `/products`, `/locations`, `/gallery` × 4 viewports)
  - `phase342-screenshots` desktop + mobile ✓
- Secret scan: no `.env*` or credentials staged (logo PNG + code + screenshots only).

## Screenshots — `artifacts/web-vision-phase-3-4-2-final-review/`

01-home-empty-desktop · 02-home-complete-desktop · 03-home-complete-mobile ·
04-logo-picker-desktop · 05-product-picker-with-images-desktop ·
06-location-picker-with-images-desktop · 07-products-library-desktop ·
08-locations-library-desktop · 09-gallery-clean-desktop · 10-shell-logo-light-desktop ·
11-shell-logo-dark-desktop · 12-sign-in-logo-desktop

The complete-Home shots show a selected logo, two selected products, a selected
location, selected thumbnails, Style / Position / Aspect ratio and the Generate
Mockup action.

## Remaining limitations

- **Image generation is still mocked** (`MockImageAdapter`) — products/locations in
  the live data have no uploaded images, so the "No image uploaded" fallback is what
  appears for them (by design; no fake photography added).
- A dedicated **square app-icon** version of the Malahi logo is still needed.
- Unrendered legacy ≤3.4 components remain in the tree for a later deletion pass.
