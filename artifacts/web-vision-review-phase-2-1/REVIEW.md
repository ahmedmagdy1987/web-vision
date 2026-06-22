# Web Vision — Phase 2.1 Review (Mobile Workflow & Visual Consistency)

A focused follow-up to Phase 2 addressing only the confirmed issues from the Phase 2 screenshot package. The desktop foundation (Home, Studio) is preserved; architecture, repositories, domain models, and tested flows are unchanged.

> Status: **ready for another visual review** — not production-ready (image generation is still mocked; storage is still localStorage).

## Confirmed issues fixed

1. **Result dimension ↔ aspect-ratio inconsistency.** Mock + seed now derive pixel dimensions from the requested aspect ratio via a shared `dimensionsForAspect()` helper. Seeded results carry consistent metadata; gallery cards and the detail preview are aspect-aware; portrait/square results no longer sit in a landscape frame (the detail preview is width-capped for portrait). One seed result is now 9:16 so all of 1:1 / 9:16 / 16:9 / 3:2 are demonstrable. (`07-gallery-detail-portrait-desktop.png` shows `720×1280 · 9:16`; `06-...-square` shows `1280×1280 · 1:1`.)
2. **Mobile Studio is now a step workflow** — Assets → Location → Settings → Review — with a compact step indicator, preserved selections, per-step validation gating (Continue disabled until requirements met), Back/Continue actions, a Review summary (brand, logo, product count, location, output) with the readiness checklist and Generated Instructions, and **Generate only in Review**. A **single** sticky action bar sits above the bottom nav (no stacked fixed bars). Desktop three-panel Studio is unchanged.
3. **Mobile Gallery filters simplified.** Search stays visible; a compact bar shows a **Filters** button (with active-count badge) + a compact **Sort**; active filters render as removable chips with **Clear all**; the full Brand/Product/Location/Status form opens in a bottom sheet. Results appear in the first viewport. Desktop filter layout preserved.
4. **Mobile Home prioritizes Quick Create.** Compact hero (clamped copy), compact active-brand context, then **Quick Create (Brand + Product + Location + Visualization + Aspect → Continue in Studio)** above the metric cards. Desktop Home composition preserved (metrics before Quick Create via responsive ordering).
5. **Identity desktop density.** A **"Current brand identity"** summary fills the former empty area: logo variant thumbnails (default marked with a star), accent palette + readable foreground, product/location counts, generation-instruction status, missing-setup warnings, and Edit / Manage Identity actions — all without opening Manage. The current brand is explicit via **text ("Current" badge) and styling (ring)**.
6. **Gallery Detail hierarchy.** Image stays dominant; the right panel is grouped into **Review** (approve/reject/favorite), **Continue working** (Duplicate / Regenerate / Create variation, each with a tooltip + a helper line), **Context** (brand/products/location), and **Technical details** (collapsible Generation settings, Notes, collapsible Generated instructions). Settings are no longer all at equal priority.
7. **Global search is now functional** — a command-style header search (⌘K) across Brands, Products, Locations, and Mockups with grouped results and navigation (brand → Identity, product → Products, location → Studio prefilled, mockup → result). It replaced the previous filter-only header input; per-page search inputs remain for list filtering.
8. **Placeholder imagery improved.** Products use category-specific silhouettes (Arcade cabinet, racing sim, redemption tower, ferris wheel, soft-play blocks, VR headset, sports ball…) with the product name/category and a clear **"PLACEHOLDER"** tag, so products are distinguishable beyond color. Scenes also carry the placeholder tag.

## Screens included (this folder)

| File | Screen | Viewport |
| --- | --- | --- |
| `01-home-mobile.png` | Home (Quick Create prioritized) | 390×844 |
| `02-studio-assets-mobile.png` | Studio step 1 (Assets) | 390×844 |
| `03-studio-review-mobile.png` | Studio step 4 (Review + Generate) | 390×844 |
| `04-gallery-mobile.png` | Gallery (compact filters, results early) | 390×844 |
| `05-identity-desktop.png` | Identity (current-brand summary) | 1440×900 |
| `06-gallery-detail-square-desktop.png` | Detail 1:1 (`1280×1280`) | 1440×900 |
| `07-gallery-detail-portrait-desktop.png` | Detail 9:16 (`720×1280`) | 1440×900 |
| `08-global-search-desktop.png` | Global search (grouped results) | 1440×900 |

Regenerate: `npm run build && npx playwright test phase21-screenshots`

## New & updated Playwright tests

- **New** `e2e/aspect.spec.ts` — asserts gallery-detail dimensions match the ratio for **1:1, 9:16, 16:9, 3:2**.
- **New** `e2e/search.spec.ts` — global search returns grouped results and navigates (brand → Identity; location → Studio).
- **New** `e2e/phase21-screenshots.spec.ts` — captures this package.
- **Updated** `e2e/mobile.spec.ts` — drives the mobile Studio **stepper** to Generate, and asserts the **lowest interactive content scrolls clear of the sticky action bar and the bottom nav** (not just horizontal overflow).
- **Updated** `e2e/screenshots.spec.ts` — Studio readiness wait works for both layouts.
- Existing specs (smoke/brand/product/studio-generation/gallery/validation/responsive) remain green.

## Verification results

- `npm run typecheck` → 0 errors
- `npm run lint` → 0 errors / 0 warnings
- `npm run build` → success (Turbopack)
- `npm run test:e2e` → **40 passed** (Chromium, production server)

## Viewport sizes tested

1440×900 (desktop), 1280×800 (laptop), 834×1112 (tablet), 390×844 (mobile) — no horizontal overflow (`e2e/responsive.spec.ts`); mobile Studio content scroll-clearance asserted (`e2e/mobile.spec.ts`).

## Local run commands

```bash
npm run dev                      # http://localhost:3000
npm run build && npm run start   # production
npm run typecheck && npm run lint
npm run build && npm run test:e2e
```

## Remaining prototype limitations

- Image generation is **mocked** (deterministic SVG placeholders behind the `ImageGenerationAdapter` interface).
- Persistence is **localStorage** (8 MB/upload cap, graceful quota failure with a toast); no auth/cloud/db.
- Placeholder imagery is generated silhouettes, clearly labeled — not real product photography.
