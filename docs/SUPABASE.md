# Web Vision — Supabase Foundation (Phase 3)

This document describes the Supabase-backed authentication, database, and private
cloud storage foundation added in Phase 3, and the steps an owner must perform to
connect a real Supabase project.

> **Status:** the Supabase backend is **code-complete and statically verified**
> (typecheck, lint, production build, and unit tests all pass), but it has **not
> been runtime-verified**: this environment has no Docker (so `supabase start`
> cannot run a local stack) and no remote project is linked. The application runs
> by default on the **local demo backend (localStorage)**. Supabase activates only
> when its env vars are present. Treat this as **a locally-verified Supabase
> foundation awaiting remote project connection.**

---

## 1. Architecture overview

```
 UI (unchanged Phase 2.1 layouts)
   │  imports singletons: brandRepository, productRepository, … (same names)
   ▼
 src/lib/repositories/index.ts  ── getDataBackend() selects ──┐
   │                                                          │
   ├── "local"    → ObservableCollection (localStorage)  ◄── demo / tests
   └── "supabase" → SupabaseCollection (per entity)       ◄── configured prod
                       │ optimistic write-through
                       ▼
        db↔domain mappers ──► Supabase Postgres (RLS)  +  private Storage
                       ▲                                        ▲
            signed URLs (never persisted)            org-scoped object paths
```

- **Backend selection** (`src/lib/config/backend.ts`): `getDataBackend()` returns
  `"supabase"` when the public env is present, else `"local"`. An explicit
  `NEXT_PUBLIC_DATA_BACKEND` overrides. There is **no silent fallback** to
  localStorage once Supabase is configured.
- **Repository contracts** (`src/lib/repositories/types.ts`): the UI depends on
  synchronous repository interfaces (`BrandRepositoryApi`, …) and the
  `useSyncExternalStore` read surface (`ReadableStore`). Both backends implement
  the same contracts, so **no component code changed**.
- **Optimistic write-through** (`src/lib/repositories/supabase/collection.ts`):
  the Supabase collections keep a referentially-stable in-memory snapshot for
  reads, hydrate asynchronously from Supabase on first subscribe, and apply
  writes optimistically (sync) then persist in the background — rolling back and
  surfacing a recoverable toast on failure.
- **Storage seam** (`src/lib/storage/*`): uploads go to a private bucket; only
  object paths are stored; previews/downloads are short-lived **signed URLs**
  minted on demand and never persisted.
- **Image-adapter seam (Phase 4):** `ImageGenerationAdapter`
  (`src/lib/services/image-adapter`) is unchanged and provider-agnostic. Phase 3
  only redirects job/result **persistence** to Supabase via the selected repos.
  Swapping the mock for a real provider in Phase 4 means changing only
  `getImageAdapter()` — the Supabase repositories are not coupled to any provider.

## 2. Required environment variables

Copy `.env.example` → `.env.local` (gitignored) and set:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Anon/publishable key (browser-safe) |
| `NEXT_PUBLIC_DATA_BACKEND` | public | optional: `supabase` \| `local` |
| `NEXT_PUBLIC_SITE_URL` | public | base URL for auth email redirects |
| `SUPABASE_SERVICE_ROLE_KEY` | **server-only** | privileged tasks; never exposed to the browser |

The service-role key is read only by `src/lib/supabase/admin.ts`, which begins
with `import "server-only"` so any accidental client import becomes a build error.
Startup validation (`src/instrumentation.ts`) logs a non-secret summary or a clear
warning when Supabase mode is selected without the public env.

## 3. Local setup (requires Docker — not available in this environment)

```bash
# 1. Install deps (done)            npm install
# 2. Start the local stack          supabase start        # needs Docker Desktop
# 3. Apply migrations + seed        supabase db reset      # runs migrations + supabase/seed.sql
# 4. (optional) regenerate types    supabase gen types typescript --local > src/lib/supabase/database.types.ts
# 5. Put the printed local URL/anon key into .env.local, then:  npm run dev
```

`supabase start` prints the local API URL, anon key, and service-role key. Until
Docker is available, the app continues to run on the demo backend with `npm run dev`.

## 4. Remote project setup (owner action required)

These steps require Supabase credentials this environment does not have:

```bash
supabase login                                  # opens browser auth
supabase link --project-ref <YOUR_PROJECT_REF>  # link this repo to the project
supabase db push                                # apply migrations to the remote DB
supabase db seed                                # (optional) load supabase/seed.sql
```

Then set `.env.local` (local dev) and the hosting platform env (e.g. Vercel) with
the project URL, anon key, and service-role key from **Project Settings → API**.
Do **not** initialize the project with extra schema; the migrations are the
source of truth.

## 5. Migrations & seed

Versioned SQL lives in `supabase/migrations/`:

| File | Contents |
| --- | --- |
| `20260622120000_init_schema.sql` | Tables, enums, indexes, constraints, `updated_at` triggers |
| `20260622120100_rls_policies.sql` | Membership helpers, auth bootstrap, RLS policies |
| `20260622120200_storage.sql` | Private bucket + object-level storage policies |

`supabase/seed.sql` seeds one organization, brands, categories, products, and
locations (no auth users, no secrets). Apply with `supabase db reset` (local) or
load against a linked project.

## 6. Authentication & owner bootstrap

Auth is **email + password** via Supabase Auth, wired for the Next.js App Router:

- `src/middleware.ts` → `updateSession()` refreshes the session cookie and
  redirects unauthenticated users to `/sign-in` (no-op in demo mode).
- `src/app/sign-in/page.tsx` — minimal internal sign-in page.
- `src/app/auth/callback/route.ts` — exchanges the auth `code` for a session
  (email confirmation / password reset / magic link).
- `src/lib/auth/auth-context.tsx` — resolves the session, loads memberships, and
  publishes the active org/user to the repository context.

**Bootstrapping the first owner:**

1. Create a user in Supabase Auth (Dashboard → Authentication → Add user, or sign
   up through the app once email auth is enabled). The `handle_new_user` trigger
   creates their `profiles` row automatically.
2. Make them an organization owner, either:
   - **As that user:** call the `create_organization(p_name, p_slug)` RPC (the
     app's org-onboarding screen does this) — it inserts the org and an `owner`
     membership atomically; or
   - **As an admin (SQL / service role):** insert the organization, then an
     `organization_members` row with `role = 'owner'`, `status = 'active'`.

## 7. Storage strategy

A single **private** bucket `web-vision` with deterministic, org-scoped paths
(`src/lib/storage/paths.ts`):

```
organizations/{orgId}/brands/{brandId}/{assetId}.{ext}
organizations/{orgId}/products/{productId}/{assetId}.{ext}
organizations/{orgId}/locations/{locationId}/{assetId}.{ext}
organizations/{orgId}/results/{jobId}/{resultId}.{ext}
```

- Objects are private; views/downloads use short-lived signed URLs
  (`createSignedUrl(s)`), **never persisted** to the DB.
- Uploads validate type, extension, MIME, and size (8 MB cap), use unique
  filenames, and reject path traversal.
- If a DB write fails after upload, the orphaned object is cleaned up
  (`uploadThenPersist`); failed deletions retain enough metadata to reconcile.
- The 2nd path segment (`{orgId}`) is what the storage RLS authorizes against.

## 8. Row-Level Security & role matrix

RLS is enabled on **every** user-facing table. Policies are based on **active
organization membership** via SECURITY DEFINER helpers (`is_org_member`,
`org_role`, `has_min_role`). The UI mirrors these rules
(`src/lib/auth/permissions.ts`) for hide/disable, but the database is the source
of truth.

| Capability | owner | admin | editor | viewer |
| --- | :---: | :---: | :---: | :---: |
| Read org data | ✅ | ✅ | ✅ | ✅ |
| Brands, categories (structural config) | ✅ | ✅ | — | — |
| Members / org settings | ✅ | ✅ | — | — |
| Products, product assets | ✅ | ✅ | ✅ | — |
| Locations, location assets | ✅ | ✅ | ✅ | — |
| Brand logo assets | ✅ | ✅ | ✅ | — |
| Generation presets / jobs / results (incl. review & favorite) | ✅ | ✅ | ✅ | — |
| Storage objects (read) | ✅ | ✅ | ✅ | ✅ |
| Storage objects (write) | ✅ | ✅ | ✅ | — |
| Delete organization | ✅ | — | — | — |

Users outside an organization cannot read or write any of its data. Archived
records are filtered by the repository layer (the same behavior as Phase 2).

## 9. Repository backend selection

`src/lib/repositories/index.ts` chooses the implementation once at module load
and exports the same singleton names the app already imports. The localStorage
repositories remain available **only** as the explicit demo/dev/test backend.

## 10. Testing

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint (0 warnings)
npm run build         # next build (production)
npm run test:unit     # vitest — pure logic (mappers, paths, permissions, validation, aspect, env)
npm run build && npm run test:e2e   # Playwright (demo backend by default)
```

Supabase-dependent integration/E2E specs are authored but **guarded to skip**
when Supabase env is absent; run them against a linked/local project.

## 11. Backup & recovery

- Source + migrations are versioned in git (private GitHub repo). A migration +
  `supabase db reset` reproduces the schema deterministically.
- For a linked project, use `supabase db dump` for SQL backups and Supabase's
  point-in-time recovery / scheduled backups for the managed database.
- Storage objects should be backed up via the Supabase Storage backup tooling or
  a periodic bucket export; object paths are reproducible from the DB rows.

## 12. Phase 4 — image provider seam

`ImageGenerationAdapter` stays provider-agnostic. To integrate a real generator:
implement the interface and return it from `getImageAdapter()`. Job/result
persistence (Supabase + Storage) already flows through the selected repositories,
so the provider swap requires **no repository changes**.
