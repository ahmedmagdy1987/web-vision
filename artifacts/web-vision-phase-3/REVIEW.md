# Web Vision — Phase 3 Review (Supabase Auth, Database & Cloud Storage)

A foundation phase that replaces browser-only auth, localStorage persistence, and
base64 asset storage with a Supabase-backed architecture — **without redesigning
the product**. The accepted Phase 2.1 layouts, domain models, repository/service
boundaries, and the provider-agnostic image adapter are all preserved.

> **Status: locally-verified Supabase foundation awaiting remote project
> connection.** The Supabase backend is code-complete and statically verified
> (typecheck, lint, production build, unit tests). It is **not runtime-verified**:
> this environment has **no Docker** (`supabase start` cannot run) and **no remote
> project is linked** (credentials were not provided and must not be invented).
> The app runs by default on the **local demo backend (localStorage)**; Supabase
> activates only when its env vars are set. This is **not** a cloud-backed beta yet.

## What changed

- **Database**: 14 versioned tables with UUID PKs, FKs, indexes, uniqueness
  constraints, `updated_at` triggers, and Postgres enums mirroring the domain.
- **RLS**: enabled on every user-facing table, scoped to active organization
  membership with an owner/admin/editor/viewer role matrix; membership helpers are
  SECURITY DEFINER to avoid recursion.
- **Auth**: email + password via Supabase Auth, App Router middleware session
  refresh + route protection, auth callback route, minimal sign-in page, account
  menu + sign-out, protected shell, org-onboarding, and a profile-on-signup
  trigger + `create_organization` owner-bootstrap RPC.
- **Storage**: a single private bucket with org-scoped paths, signed-URL previews
  (never persisted), upload validation, orphan cleanup, and base64→Storage import.
- **Repositories**: Supabase implementations behind the existing synchronous
  contracts (optimistic write-through) with explicit db↔domain mappers, plus a
  no-silent-fallback backend selector. The localStorage repos remain as the
  explicit demo/dev/test backend.
- **Generation**: mock generation now persists job, status transitions, result
  metadata, and the result file (to private Storage) through the selected repos;
  the `ImageGenerationAdapter` interface is untouched.
- **Tooling**: `@supabase/supabase-js`, `@supabase/ssr`, `vitest`; `.env.example`,
  startup env validation, and a unit-test suite.

## Database tables

| Table | Purpose |
| --- | --- |
| `organizations` | Tenant root (name, slug) |
| `profiles` | 1:1 with `auth.users` (display name, avatar) |
| `organization_members` | User↔org membership with role + status |
| `brands` | Brand config (accent, instructions, default logo) |
| `brand_assets` | Logo assets (primary/secondary/icon/light/dark) |
| `product_categories` | Per-org product categories |
| `products` | Products (dimensions, usage, tags) |
| `product_assets` | Product main + reference images |
| `locations` | Client locations (environment, main image) |
| `location_assets` | Location images |
| `generation_presets` | Saved generation settings |
| `generation_jobs` | Generation requests + status + provider info |
| `generation_job_products` | Job ↔ selected products relation |
| `generation_results` | Result metadata, review/favorite, snapshot |

## Storage strategy

Single private bucket `web-vision`; deterministic org-scoped paths
(`organizations/{orgId}/{kind}/{parentId}/{assetId}.{ext}`). Only paths are
stored; previews are short-lived signed URLs minted on demand. Uploads validate
type/extension/MIME/size (8 MB), use unique filenames, reject traversal, and clean
up orphaned objects when a subsequent DB write fails.

## Authentication flow

Email + password. `src/middleware.ts` refreshes the session and redirects
unauthenticated users to `/sign-in` (no-op in demo mode); `/auth/callback`
exchanges the code for a session; `src/lib/auth/auth-context.tsx` resolves the
session, loads memberships, and sets the active org/user; the app shell shows
loading / redirect / org-onboarding states and an account menu with sign-out. The
service-role key is server-only (`import "server-only"`).

## Role matrix

| Capability | owner | admin | editor | viewer |
| --- | :---: | :---: | :---: | :---: |
| Read org data | ✅ | ✅ | ✅ | ✅ |
| Brands / categories / members (config) | ✅ | ✅ | — | — |
| Products, locations, assets, presets, jobs, results | ✅ | ✅ | ✅ | — |
| Storage write | ✅ | ✅ | ✅ | — |
| Delete organization | ✅ | — | — | — |

## Tests run & results

| Gate | Result |
| --- | --- |
| `npm run typecheck` | 0 errors |
| `npm run lint` | 0 errors / 0 warnings |
| `npm run build` | success (Next.js 16, Turbopack) |
| `npm run test:unit` | 34 passing (6 files: mappers, paths, permissions, upload validation, aspect, env) |
| `npm run test:e2e` | runs on the demo backend (Phase 2.1 suite preserved) |

Supabase integration/E2E specs are authored and **guarded to skip** without
Supabase env; they require a linked/local project to execute.

## Security checks

- RLS enabled on all 14 user-facing tables; policies scoped to active membership.
- Private storage bucket; object policies scoped to org membership + role.
- Service-role key is server-only (`import "server-only"` in `admin.ts`); only the
  URL + anon key reach the browser.
- No secrets committed; `.env*` is gitignored; `.env.example` holds placeholders.
- Defense-in-depth file validation (type/extension/MIME/size); org-scoped,
  traversal-safe storage paths; no cross-org access (RLS + path authorization).
- Safe error messages via the repository error reporter (no DB internals leaked).
- Dependency audit: 2 moderate advisories introduced by the new Supabase deps —
  noted for follow-up; no production-blocking issue identified.

## Known limitations

- **Runtime unverified**: no Docker locally and no remote project, so migrations,
  RLS, auth, and storage have not been exercised end-to-end. Owner must link a
  project and run `supabase db push` + the E2E/integration suites to confirm.
- **Optimistic write-through**: Supabase writes are applied to the cache first and
  reconciled in the background; on failure the change is reverted with a toast.
- **Product/location image editing on update** is limited to scalar fields in the
  Supabase backend (image set changes go through create or a future asset flow).
- **localStorage importer** is implemented as a documented module but not wired
  into the UI.
- Image generation remains **mocked**; Phase 4 swaps the adapter only.

## Exact local setup steps

1. `npm install`
2. `supabase start` (requires Docker Desktop)
3. `supabase db reset` (applies migrations + `supabase/seed.sql`)
4. Copy the printed URL + anon key into `.env.local`; optionally set
   `SUPABASE_SERVICE_ROLE_KEY`
5. `npm run dev`
6. Sign up a user, then create an organization (becomes owner)

Without Docker, run `npm run dev` to use the demo backend unchanged.

## Remote setup steps still requiring the owner

1. `supabase login`
2. `supabase link --project-ref <PROJECT_REF>`
3. `supabase db push` (and optionally load `supabase/seed.sql`)
4. Set project URL, anon key, and service-role key in `.env.local` and hosting env
5. Bootstrap the first owner (create user → `create_organization` RPC, or insert an
   owner membership via SQL/service role)
6. Run `npm run build && npm run test:e2e` against the linked project to verify

See [`docs/SUPABASE.md`](../../docs/SUPABASE.md) for full details.
