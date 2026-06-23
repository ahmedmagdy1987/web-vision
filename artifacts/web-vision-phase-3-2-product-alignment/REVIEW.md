# Web Vision — Phase 3.2 Review (Projects, Locations & single-workspace alignment)

Corrects the product model so Web Vision presents as a single internal Malahi
tool organized by **Projects**, removes generic multi-tenant/organization UX,
adds a first-class **Locations** feature, fixes the manifest error, and resolves
the real owner's empty-workspace problem. No real image API was integrated; the
accepted visual system was not redesigned. Contains no identifying values.

## 1. Final single-workspace model

Web Vision is invite-only and used only by the Malahi team. The Malahi
organization remains in the database purely as a **hidden system boundary**
(Row-Level Security, membership, roles, data isolation). Users never see
organizations, workspaces, tenant creation, org switching, or "Create your
workspace" anywhere.

Visible operational hierarchy:

```
Malahi internal tool
└── Projects
    ├── Brands & identities
    ├── Products & games
    ├── Locations & site photos
    ├── Generation jobs
    └── Generated results
```

- Self-service organization creation was **removed** (`createOrganization` is gone
  from the client; the old "create workspace" onboarding is deleted).
- An authenticated user with **no active Malahi membership** sees a branded
  **"Access pending"** screen (clear explanation + Sign out + Retry) — not a
  workspace-creation form.
- The account menu shows a static **"Malahi Studio"** team label (no org switcher).
- The header context selector is now a **Project** selector (brand selection moved
  to Home Quick Create and Studio).

## 2. Projects architecture

- New `projects` table (id, organization_id, name, slug, client_name, description,
  status, cover ref, start_date, notes, created_by, timestamps); statuses
  **active / draft / completed / archived**.
- Reusable many-to-many join tables `project_brands`, `project_products`,
  `project_locations`; generation jobs and results gained a direct `project_id`.
- Migration `supabase/migrations/20260623130000_projects.sql` applied to the live
  project; **all existing data migrated into a default "General" project**
  (4 brands, 3 products, 2 locations, 1 job, 2 results) with no data loss and no
  Storage duplication. Remote migration history matches the repo; types regenerated.
- RLS by Malahi membership/role: members read; **owner/admin/editor** write;
  viewers read-only — consistent with the rest of the schema, plus grants.
- Dual-backend repositories (localStorage demo + Supabase optimistic write-through)
  behind one shared `ProjectRepositoryApi`; active-project context in the app store
  with a `useActiveProject()` hook. A brand/product may belong to many projects; a
  location is assignable to a project.

## 3. Locations architecture

A first-class **Locations** page and nav item for the physical client sites where
games/products are visualized: create, multi-image upload, choose the primary
image, remove images, project assignment, and search/filter by project and
indoor/outdoor. Reusable in Studio. Known limitation: richer fields (city, explicit
environment type, dimensions, address) currently map onto the existing Location
fields (usage = indoor/outdoor, description = site notes) — a domain expansion is
deferred to avoid churn.

## 4. Quick Create dependencies (Home)

Home Quick Create is the fastest creation entry point and is **project-first**:
Project → Brand → Logo → Product(s) → Location → Visualization type → Aspect ratio
→ optional Notes → **Continue in Studio**. Selecting a project filters the brand,
product, and location options to that project's assigned assets; changing the
project drops now-invalid selections. Every empty dropdown shows an explicit reason
and a direct action instead of a blank/"No brand" control:

- No projects → "Create a project first" → /projects
- No brands for this project → "Add a brand in Identity" → /identity
- No products for this project → "Add products in Products" → /products
- No locations for this project → "Add a location in Locations" → /locations

"Continue in Studio" is disabled until project + brand + product + location are
ready, with a line naming what is missing.

## 5. Studio workflow & generation "cooking" experience

Studio flow: Project → Brand & logo → Products → Location → Settings → Review →
Generate. Desktop keeps the three-area layout (left assets incl. Project, center
canvas, right controls); mobile keeps the 4-step flow (Assets/Location/Settings/
Review). The dead-end "Create a brand to get started" block is replaced by an
**informative readiness state** covering Project/Brand/Logo/Product/Location — each
missing item shows what's missing, why, and a direct action.

The center canvas has a premium stage-based **"cooking"** generating state:
animated gradient, soft moving light, shimmer, subtle blur, ambient shapes, and
cycling stage text — *Preparing assets → Reading the location → Composing the scene
→ Integrating products → Applying brand identity → Rendering final outputs* — driven
by the mock adapter's progress (stage-based, **not** a fake exact percentage),
elapsed time, optional cancel, and a `prefers-reduced-motion` fallback. The
`MockImageAdapter` drives it until a real provider is integrated (Phase 4).

## 6. Gallery & global search

Gallery gained a **Project** filter (filters results by `project_id`) alongside the
existing brand/product/location/status/date filters, and shows the project on cards
and in result detail. Global search gained a **Projects** group (no Organizations).
Identity and Products gained project scope filters with project-specific empty
states.

## 7. Real-owner status & handover (partial — owner-gated)

- **Empty-data root cause:** the real owner had been bound to an **empty
  accidental organization** they created via the old "Create workspace" flow — the
  existing Malahi data lives in the operational Malahi org, which they were not a
  member of, so the header showed "No brand" and Studio showed "Create a brand".
- **Fix (done, verified):** the real owner was reassigned as an **active owner of
  the operational Malahi org**; the empty accidental org was confirmed to hold no
  operational data and removed; leftover QA test brands were cleaned. Only the
  Malahi org remains. The real owner will see the existing Malahi brands/products/
  locations/results on refresh. Owner-authorized mutations persist (verified via the
  same-org persistence test and the live RLS owner role).
- **Deferred (owner-gated):** the synthetic verification owner is **preserved**; the
  final handover cleanup (disabling/removing the synthetic account, its membership,
  and its credentials from `.env.local`) is **not** done — it must wait until the
  owner explicitly confirms the real account loads the Malahi workspace and data.
  Automated tests will move to temporary users at that point.

## 8. Manifest fix

Root cause: the auth **proxy intercepted `/manifest.webmanifest`** (and the
`apple-icon` route) and redirected unauthenticated requests to `/sign-in`, so the
browser received HTML and reported *"Manifest: Line 1, column 1, Syntax error."*
Fix: the proxy matcher + public-path list now exclude manifest/icon/metadata
routes. Verified live — `/manifest.webmanifest` returns **200** with
`application/manifest+json` and valid JSON; `/icon.svg` and `/apple-icon` resolve;
protected routes still redirect. An automated manifest parse test was added.

## 9. Tests & results

- **Typecheck** 0 · **Lint** 0 · **Build** OK · **Unit** 37 passed (incl. project
  repository tests).
- **Demo-backend regression:** 44 passed + 12 guarded-skipped (no existing flow
  broken by the product-model rebuild).
- **Live Supabase suite:** auth / onboarding / branding / manifest / persistence /
  smoke **16 passed**; projects + locations + 7-route smoke **3 passed** — zero
  configuration-based Supabase skips when configured.
- **RLS role-matrix + cross-org + Storage isolation:** verified live (prior phases;
  unchanged model extended to projects).
- **Dependency audit:** 2 moderate (`postcss` via `next@16.2.9`) — accepted, not
  reachable at runtime.

## 10. Visual review artifacts

`artifacts/web-vision-phase-3-2-product-alignment/` — captured live:
`01-home-quick-create-desktop`, `02-projects-desktop`, `03-project-detail-desktop`,
`04-identity-project-filter-desktop`, `05-products-project-filter-desktop`,
`06-locations-desktop`, `07-studio-ready-desktop`, `08-studio-generating-desktop`,
`09-gallery-project-filter-desktop`, `10-home-mobile`, `11-studio-generating-mobile`,
`12-locations-mobile`.

> Honesty note: `08-studio-generating-desktop` and `11-studio-generating-mobile`
> capture the Studio ready/review state. The "cooking" generating canvas is
> implemented and is exercised by the passing live mobile-generation test, but a
> clean mid-generation frame was not reliably captured in automation (the mock
> generation completes in ~2s).

## 11. Known limitations

- Image generation is still **mocked** (Phase 4 seam preserved).
- Final owner handover + synthetic-account removal are **deferred** until the owner
  confirms access (manual step).
- Location richer fields (city/dimensions/address/environment type) map onto
  existing fields for now.
- Mid-generation "cooking" frame not captured in the screenshot artifacts (see §10).
- `postcss` moderate advisory accepted pending a `next` patch.
