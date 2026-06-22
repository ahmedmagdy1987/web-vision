# Web Vision — Phase 2 Visual & UX Review

Internal visual-generation workspace for the **Malahi** family-entertainment team. This package documents the Phase 2 product/UX/visual acceptance pass: the app was run in a real browser (Chromium via Playwright), every core journey was exercised, and the screenshots in this folder are captured from the running production build.

> Status: **ready for owner visual review** (not production-ready; image generation is still mocked).

## Product flow overview

The core journey, supported end-to-end on every screen:

1. **Select a brand** (global selector in the header; also chosen in Home Quick Create and Studio).
2. **Select the brand logo** (Studio shows all variants; default is preselected).
3. **Select one or more games/products** (Products catalog multi-select → Studio, or pick in Studio).
4. **Upload or select a client location** (reusable saved locations, or upload new with a chosen main image).
5. **Configure visual-generation preferences** (Composition / Style / Output, with Advanced options progressively disclosed).
6. **Add optional notes.**
7. **Review the composed generation instructions** (collapsible, layered, copyable).
8. **Generate** (mock) — queued → processing → completed/failed, persisted, then redirect to the Gallery result.
9. **Review, approve/reject, favorite, duplicate, regenerate, or create a variation.**

## Screens included (screenshots in this folder)

| File | Screen | Viewport |
| --- | --- | --- |
| `01-home-desktop.png` | Home (launchpad) | 1440×900 |
| `02-identity-desktop.png` | Identity (brands & logos) | 1440×900 |
| `03-products-desktop.png` | Products (catalog) | 1440×900 |
| `04-studio-complete-desktop.png` | Studio with a complete setup | 1440×900 |
| `05-studio-processing-desktop.png` | Studio processing state | 1440×900 |
| `06-gallery-desktop.png` | Gallery | 1440×900 |
| `07-gallery-detail-desktop.png` | Gallery result detail | 1440×900 |
| `08-home-mobile.png` | Home | 390×844 |
| `09-studio-mobile.png` | Studio | 390×844 |
| `10-gallery-mobile.png` | Gallery | 390×844 |

Regenerate with: `npm run build && npm run test:screenshots`

## Responsive viewport sizes tested

Verified (automated, no horizontal overflow) across all six routes at:

- **Large desktop / default** — 1440×900 (screenshot package + manual review)
- **Laptop** — 1280×800 (`e2e/responsive.spec.ts`)
- **Tablet** — 834×1112 (`e2e/responsive.spec.ts`)
- **Mobile** — 390×844 (`e2e/responsive.spec.ts`, `e2e/mobile.spec.ts`, screenshot package)

## UX decisions made (Phase 2)

- **Home → operational launchpad.** "Quick create" is the primary feature and now collects Brand + Product + Location + Visualization type + Aspect ratio before "Continue in Studio". Metrics are a single compact row; "Recent activity" surfaces job status (incl. processing/failed); nav cards show live status (counts / missing-setup warnings).
- **Studio width.** Studio uses a wider workspace (`max-w-[112rem]`) than administrative pages (`max-w-7xl`) via a route-aware shell.
- **Studio readiness.** A compact "Generation readiness" checklist (Brand / Logo / Products / Location / Outputs) makes it obvious what is selected, what is missing, and why Generate is disabled.
- **Progressive disclosure.** Studio controls are grouped Composition / Style & light / Output, with less-common controls (placement, camera angle, people, product scale, brand visibility, creativity, scene rules) collapsed under "Advanced options".
- **Failure is demonstrable, not random.** The mock provider fails deterministically when `#fail` appears in the notes (kept out of normal runs) so the failed state is reviewable on demand.
- **Active-brand clarity.** The currently-selected brand is marked "Current" on the Identity grid; the header selector reflects it everywhere.
- **Realistic demo data.** Replaced generic furniture/lighting data with a coherent Malahi dataset (4 brands, 11 products incl. one archived, 5 client locations, 6 completed results spanning approved/rejected/draft/favorite, plus one processing and one failed job).

## Confirmed issues found & fixed in this phase

| # | Severity | Issue (found via rendered review) | Fix |
| --- | --- | --- | --- |
| 1 | High | Quick Create omitted Brand & Product (core journey couldn't be pre-staged) | Added Brand + Product selectors; renamed action to "Continue in Studio" |
| 2 | High | Seeded processing/failed jobs were not reviewable anywhere | Added "Recent activity" on Home using the jobs repository |
| 3 | Med | Studio lacked an explicit readiness/what's-missing summary | Added `ReadinessSummary` checklist |
| 4 | Med | All Studio controls were flat (no progressive disclosure) | Grouped controls + collapsible "Advanced options" |
| 5 | Med | Studio used the same width as admin pages | Route-aware shell gives Studio a wider workspace |
| 6 | Low | Currently-selected brand wasn't indicated on the Identity grid | "Current" badge + ring on the active brand card |
| 7 | Med | localStorage write failures were silent to the user | `setStorageErrorHandler` + throttled toast; documented limitation |
| 8 | Med | Demo data was off-domain (furniture) and missing processing/failed states | Rebuilt as the Malahi dataset incl. processing + failed jobs |

## Automated verification

- **Typecheck:** `npm run typecheck` → 0 errors.
- **Lint:** `npm run lint` → 0 errors / 0 warnings.
- **Production build:** `npm run build` → success (Turbopack).
- **E2E:** `npm run test:e2e` → **25 passed** (Chromium, against the production server). Specs in `e2e/`:
  - `smoke.spec.ts` — sidebar navigation across all sections; **no console errors / uncaught exceptions** across all routes + a result detail.
  - `brand.spec.ts` — create a brand; persists after refresh.
  - `product.spec.ts` — create a product; persists after refresh.
  - `studio-generation.spec.ts` — upload a new client location in Studio + full generation → gallery result; full generation from a complete prefilled setup.
  - `gallery.spec.ts` — open a result; Duplicate Setup and Create Variation restore the setup into Studio.
  - `validation.spec.ts` — Generate disabled until required selections; deterministic failed state + recovery.
  - `mobile.spec.ts` — complete Studio generation on mobile; no horizontal overflow.
  - `responsive.spec.ts` — no horizontal overflow at laptop/tablet/mobile across 6 routes.
  - `screenshots.spec.ts` — captures this review package.

## Known prototype limitations

- **Mock generation only.** No real image API; results are deterministic SVG placeholders rendered by `MockImageAdapter` behind the `ImageGenerationAdapter` interface.
- **localStorage persistence.** All data (including uploaded images as base64 data URLs) lives in the browser's localStorage. Uploads are capped at **8 MB each**; very large/many uploads can exceed the per-origin quota, in which case the write fails gracefully and the user is shown a toast (no crash). Result snapshots denormalize the location image, which adds to storage use — both are expected for a prototype and resolved by moving to cloud storage in a later phase.
- **No auth / multi-user / cloud sync.** Single-browser workspace.
- **Placeholder imagery.** Brand logos and scene/product images are generated SVG placeholders, clearly labeled; they stand in for real client assets.

## Exact local run commands

```bash
# install
npm install
npx playwright install chromium     # for e2e/screenshots only

# develop
npm run dev                         # http://localhost:3000

# production
npm run build
npm run start                       # http://localhost:3000

# quality gates
npm run typecheck
npm run lint

# tests / screenshots (build first)
npm run build
npm run test:e2e                    # all Playwright specs (starts the prod server on :3210)
npm run test:screenshots            # just the review screenshot package
```

## Exact route list

| Route | Screen | Rendering |
| --- | --- | --- |
| `/` | Home / launchpad | Static (client-hydrated) |
| `/identity` | Brand & logo management | Static (client-hydrated) |
| `/products` | Product catalog | Static (client-hydrated) |
| `/studio` | Composition & generation workspace | Static (client-hydrated) |
| `/gallery` | Generation history | Static (client-hydrated) |
| `/gallery/[id]` | Result detail | Dynamic (server-rendered on demand) |

## Recommended owner review path

1. **Home** — confirm the launchpad answers "which brand, what can I create, what's available, what next". Try **Quick create** (pick brand → product → location → Continue in Studio).
2. **Identity** — open a brand (Manage), review logo variants/default/classification, palette, and brand instructions; note the "Current" brand marker.
3. **Products** — search/filter by brand & category; multi-select two products → "Open in Studio".
4. **Studio** — observe the readiness checklist; expand "Advanced options"; open "Generated instructions"; click **Generate** and watch queued → processing → completed → redirect to the result. Then type `#fail` in Notes and Generate to see the failed state.
5. **Gallery** — switch grid/list, filter, favorite; open a result; try **Duplicate setup**, **Regenerate**, **Create variation**.
6. **Responsive** — repeat the Studio generation on a phone-sized window.
