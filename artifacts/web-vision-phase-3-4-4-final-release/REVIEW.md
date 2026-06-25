# Phase 3.4.4 — progress (Parts 1, 2, 6, 7, 8)

Baseline `78e1676` on `phase-3-4-3-final-polish-openai-foundation`. No OpenAI request
made. Not merged to main; not deployed. Delivered + verified this pass:

## 1. Pre-fix OpenAI result metadata repaired (single record, non-destructive)
The one OpenAI result (`84d65b19…`, uniquely identified: the only `webp`/provider=openai
result) had its snapshot completed with the missing display fields only — resolved from
its existing reference IDs:
- brandName **Malahi Arcade**, brandAccent **#7c3aed**, productNames **[SLUSH MACHINE]**,
  locationName **test**.
- Image, job relationship, provider metadata, usage, dimensions, Storage path, review
  (`approved`) and favorite (`true`) all UNCHANGED; reference IDs preserved; no duplicate.
- Verified in Gallery card + Detail (screenshot 01) — correct names, no Mock badge.

## 2. Invalid seed presentation fixed
Mapper no longer coerces a null seed to 0 (`row.seed == null ? undefined : Number(...)`);
domain `seed` is optional; Detail omits the seed label entirely when there's no real
seed. OpenAI results show no "seed 0". Unit-tested.

## 7. Reusable image lightbox (`components/common/image-lightbox.tsx`)
Opens on image click; shows the original image at natural ratio with `object-fit: contain`
(never cropped/stretched); dark backdrop; Escape + Close button; focus trapped & restored
(Radix Dialog); next/prev + "n of m" for multi-image sets; zoom in/out/fit + reset; wheel
+ double-click + drag-to-pan; no horizontal overflow; works desktop + mobile. Used by
generated results, products, locations, logos.

## 6. Image preview separated from selection
Clicking an asset/result image opens the Lightbox and never selects (the product image
button stops propagation so it cannot toggle the card). Checkboxes/menus/actions are
unaffected. Verified: product lightbox (02, 11), result lightbox (08).

## 8. Secure direct download (`/api/results/[id]/download` + client blob flow)
Server route (server-only, nodejs): authenticates the user, verifies active org
membership (on top of RLS), resolves the private object server-side, and streams it with
`Content-Disposition: attachment` + correct `Content-Type`/`Content-Length`; sanitized,
traversal-proof filename; 400/401/403/404/500 responses; never exposes the key or Storage
URL. Client fetches the bytes into a Blob and downloads via a temporary object URL (revoked
after) — same page, no new tab. Download added to the lightbox. Verified end-to-end
(route returns 200 + `attachment` + `image/webp`); client-bundle scan clean.

## Verification
Typecheck ✓ · Lint ✓ · Unit 91 ✓ · Build ✓ · e2e (auth + smoke + this slice) 5/5 ✓ ·
client-bundle secret scan clean. No console/page errors across routes + viewports.

## Pending (not in this pass)
- Part 3/4: individual delete + archive menus with custom Malahi confirm dialogs +
  reference-aware safe-delete (referenced→archive, unreferenced→delete + Storage cleanup)
  for Products and Locations (Logos already have this).
- Part 5: multi-select + bulk delete for Locations/Logos (+ bulk summary/partial-failure).
- Parts 9–16: full verification sweep, remaining screenshots, final release commit + tag,
  merge to main, Vercel production config (BLOCKED: Vercel CLI not installed + the
  OPENAI_API_KEY secret must be set by the owner), and production deploy.

## Screenshots
01-gallery-real-result-desktop · 02-product-lightbox-desktop ·
08-gallery-result-lightbox-desktop · 09-gallery-download-state-desktop ·
01-products-library-selection-desktop · 11-image-lightbox-mobile
