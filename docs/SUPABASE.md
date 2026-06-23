# Web Vision — Supabase Foundation (Phase 3 / 3.1 / 3.2A / 3.2)

This document describes the Supabase-backed authentication, database, and private
cloud storage foundation (Phase 3), its **live connection + runtime verification**
(Phase 3.1), and the **invitation onboarding + auth-branding fixes** (Phase 3.2A,
see §6 and §15 and [`../artifacts/web-vision-phase-3-2a/REVIEW.md`](../artifacts/web-vision-phase-3-2a/REVIEW.md)).

> **Status (Phase 3.1 — live):** the Supabase backend is **connected to a real
> dedicated project (`web-vision-malahi`) and runtime-verified.** Migrations are
> applied to the live database, RLS + private Storage are enforced, an owner is
> bootstrapped, and authentication, live CRUD, organization isolation, and signed
> private-Storage URLs were all verified against the cloud project (see
> [`../artifacts/web-vision-phase-3-1/REVIEW.md`](../artifacts/web-vision-phase-3-1/REVIEW.md)).
> This is a **secured cloud-backed internal beta**. The local demo backend
> (localStorage) is preserved for tests and offline development; a configured
> Supabase environment never silently falls back to it.
>
> Note: local-stack development (`supabase start`) still requires Docker; the live
> verification was performed directly against the remote project, which does not.

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

## 4. Remote project setup (DONE for `web-vision-malahi`)

The repository is already linked to the dedicated project and the migrations have
been pushed live. To reproduce on another project:

```bash
supabase login                                  # browser auth (one-time)
supabase link --project-ref <YOUR_PROJECT_REF>  # link this repo to the project
supabase db push --linked                       # apply migrations to the remote DB
supabase db query --linked --file supabase/seed.sql   # load demo data (idempotent)
```

Then copy `.env.example` → `.env.local` and fill in the project URL, anon key, and
service-role key from **Project Settings → API**, and set the same on the hosting
platform (e.g. Vercel). Do **not** initialize the project with extra schema; the
migrations in `supabase/migrations/` are the source of truth. `.env.local` is
gitignored and must never be committed.

## 5. Migrations & seed

Versioned SQL lives in `supabase/migrations/`:

| File | Contents |
| --- | --- |
| `20260622120000_init_schema.sql` | Tables, enums, indexes, constraints, `updated_at` triggers |
| `20260622120100_rls_policies.sql` | Membership helpers, auth bootstrap, RLS policies |
| `20260622120200_storage.sql` | Private bucket + object-level storage policies |
| `20260623120000_grants.sql` | **Phase 3.1:** grants DML + execute to `authenticated`/`service_role` (the CLI migration role did not inherit project default privileges, which would have blocked the app's `authenticated` role). RLS still governs row access. |

`supabase/seed.sql` seeds one organization, brands, categories, products, and
locations (no auth users, no secrets). Apply against a linked project with
`supabase db query --linked --file supabase/seed.sql` (idempotent — fixed UUIDs +
`on conflict do nothing`), or `supabase db reset` locally. Generation jobs/results
carry binary objects and so are seeded at runtime by
`scripts/seed-results.mjs` (see §13).

## 6. Authentication & owner bootstrap

Auth is **email + password** via Supabase Auth, wired for the Next.js App Router:

- `src/proxy.ts` (Next 16 proxy convention) → `updateSession()` refreshes the
  session cookie and redirects unauthenticated users to `/sign-in` (no-op in demo
  mode or when the backend is explicitly `local`). `/sign-in` and `/auth/*` are public.
- `src/app/sign-in/page.tsx` — branded internal sign-in (show/hide password,
  forgot-password link, expired-invite banner; no app-supplied default credentials).
- `src/app/auth/callback/route.ts` — handles both the PKCE `code` flow **and** the
  `token_hash` + `type` (verifyOtp) flow, and surfaces Supabase error redirects
  (e.g. `otp_expired`, `access_denied`) as a recovery state. Invite/recovery
  sessions are routed to `/auth/set-password`. The `next` parameter is
  open-redirect-validated (`src/lib/auth/redirect.ts`).
- `src/lib/auth/auth-context.tsx` — resolves the session, loads memberships,
  publishes the active org/user to the repository context, and exposes
  `updatePassword` / `sendPasswordReset`.

### Invitation & password-recovery onboarding (Phase 3.2A)

The invited-user lifecycle is now complete:

1. **Invite** — `scripts/invite-user.mjs` (or the dashboard) sends an invite whose
   redirect points at `/auth/callback?next=/auth/set-password` (env-aware base, see
   the redirect allow-list below).
2. **Callback** — the user opens the link; `/auth/callback` completes the session
   (code or token_hash) and forwards invite/recovery users to **`/auth/set-password`**.
3. **Create password** — `/auth/set-password` is a session-gated "Create your
   password" screen (new + confirm, show/hide, min length, mismatch rejected) using
   `supabase.auth.updateUser`; on success the user lands in the app. If the link had
   no valid session it points the user to request a fresh one.
4. **Expired / invalid / reused link** — `/auth/invite-expired` shows a deliberate
   branded recovery state ("the link is no longer valid; no password was created")
   with a "Request a new setup link" action — never the bare sign-in form.
5. **Forgot password** — `/auth/forgot-password` calls `resetPasswordForEmail` with
   the same `/auth/callback?next=/auth/set-password` redirect; the recovery callback
   lands on the set-password screen. Messaging is generic (no account enumeration).

### Redirect URL allow-list (required)

The corrected flow depends on the Supabase project's **Authentication → URL
Configuration**:

- **Site URL:** the app base (e.g. `http://localhost:3000` for local).
- **Redirect URLs** (allow-list) must include the callback for each environment:
  - Local dev: `http://localhost:3000/auth/callback`
  - E2E/test server (if running Playwright against it): `http://localhost:3210/auth/callback`
  - Production: `<production-base>/auth/callback`

The redirect base is derived from `NEXT_PUBLIC_SITE_URL` (server tooling) or the
browser origin (client) — **do not hardcode localhost in production**. Unsafe or
off-origin `next` targets are rejected to avoid open redirects.

**Bootstrapping the first owner:**

The dedicated project was bootstrapped with `scripts/bootstrap-owner.mjs` (§13),
which idempotently creates a confirmed owner/test user via the Admin API, lets the
`handle_new_user` trigger create the matching `profiles` row, and grants `owner`
membership of the seeded Malahi org. Its generated password is written **only** to
gitignored `.env.local` (`E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD`) — never committed,
printed, or passed as a shell argument.

For a **real owner** (recommended), do not invent a password:

1. Create/invite the user in Supabase Auth (Dashboard → Authentication → Add user
   or **Invite**, or `auth.admin.inviteUserByEmail` server-side) — the user sets
   their own password / accepts the invite. The `handle_new_user` trigger creates
   their `profiles` row automatically.
2. Make them an organization owner, either:
   - **As that user:** call the `create_organization(p_name, p_slug)` RPC (the
     app's org-onboarding screen does this) — it inserts the org and an `owner`
     membership atomically; or
   - **As an admin (SQL / service role):** insert an `organization_members` row
     for an existing org with `role = 'owner'`, `status = 'active'`.

Never paste a password or secret into a prompt; the owner sets it via the
dashboard/invite flow.

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

# Demo-backend regression (localStorage; supabase specs auto-skip):
WV_FORCE_DEMO=1 npm run build && WV_FORCE_DEMO=1 npx playwright test

# Live Supabase suite (reads .env.local; build in Supabase mode first):
npm run build
npx playwright test e2e/supabase-auth.spec.ts e2e/supabase-persistence.spec.ts e2e/supabase-smoke.spec.ts --workers=1
```

`playwright.config.ts` loads `.env.local` for live runs (so the guarded specs run
instead of skipping) and honors `WV_FORCE_DEMO=1` to force the demo backend. Run
the live specs with `--workers=1` — they share one live user/workspace, so they
are serial to avoid races. SQL/RLS + storage are verified with the helper scripts
in §13.

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

## 13. Operational scripts (Phase 3.1)

Run with Node's `--env-file` so they read the gitignored `.env.local` (they use the
service-role key server-side and never print secrets):

| Script | Purpose |
| --- | --- |
| `scripts/bootstrap-owner.mjs` | Idempotently create the owner/test user (Admin API), ensure its profile, and grant `owner` membership of the seeded org. Writes generated creds to `.env.local` only. |
| `scripts/seed-results.mjs` | Seed a completed demo generation job + 2 results with real placeholder objects in private Storage (idempotent; resets review/favorite state on re-run). |
| `scripts/rls-matrix.mjs` | Verify the RLS / organization-isolation matrix via real per-role authenticated API sessions, then clean up the temporary identities/rows. |
| `scripts/verify-asset-ops.mjs` | Verify private-Storage asset ops via the owner session: upload → signed URL resolves → replace primary → delete. |
| `scripts/invite-user.mjs` | **Phase 3.2A:** send a real Supabase invite with the corrected `/auth/callback?next=/auth/set-password` redirect (env-aware base). Privileged; **not auto-run**; sends a real email — invoke deliberately. |

```bash
node --env-file=.env.local scripts/bootstrap-owner.mjs
node --env-file=.env.local scripts/seed-results.mjs
node --env-file=.env.local scripts/rls-matrix.mjs
node --env-file=.env.local scripts/verify-asset-ops.mjs
node --env-file=.env.local scripts/invite-user.mjs someone@example.com   # deliberate; sends an email
```

`tests/integration/rls.sql` additionally provides copy-pasteable psql RLS checks.

## 14. Phase 3.1 runtime fixes

- **API-role grants** — `20260623120000_grants.sql` (see §5).
- **Product image editing** — `SupabaseProductRepository.updateProduct` now
  reconciles the image set (upload new, replace primary, remove deleted) with
  orphan cleanup, so editing a product's images after creation persists.
- **Optimistic writes** — on a failed remote write the local cache rolls back and a
  recoverable toast is shown (`RepositoryErrorReporter`); refresh reflects the true
  server state.
- **Dependency audit** — 2 moderate advisories (`postcss <8.5.10`, transitive via
  `next@16.2.9`). The only offered fix is a forced `next@9` downgrade, which is
  rejected; the issue is build-time and not reachable at runtime. Accepted risk;
  resolves when `next` ships a patched `postcss`.
- **localStorage importer** — `src/lib/migration/local-import.ts` remains a typed,
  non-UI utility (no automatic import); wiring an owner-only import screen is
  deferred to avoid unnecessary risk.

## 15. Phase 3.2A — invitation onboarding & auth branding

Fixed the invited-user lifecycle and refined the authentication screens (no main
app redesign). Highlights:

- **Onboarding flow** — see §6: robust `/auth/callback`, `/auth/set-password`,
  `/auth/invite-expired`, `/auth/forgot-password`. Invited/recovering users now get
  a "Create your password" screen instead of the bare sign-in form; expired/invalid
  links show a branded recovery state.
- **Sign-in branding** — shared `AuthCard` with the Web Vision `Aperture` mark,
  workspace description, show/hide password, forgot-password link, expired-invite
  banner, correct `autocomplete` (`username` / `current-password` / `new-password`),
  no app-supplied default credentials, no public sign-up.
- **Browser metadata** — `src/app/icon.svg` (Aperture brand mark) replaces the
  default Next favicon; generated apple touch icon (`src/app/apple-icon.tsx`),
  `src/app/manifest.ts`, theme color `#6d28d9`, and a `"%s — Web Vision"` title
  template (e.g. "Sign in — Web Vision", "Studio — Web Vision").
- **Bug fix** — Supabase collections return `[]` when there is no active org, so
  auth/onboarding pages no longer raise a spurious "couldn't load" error toast.
- **Invite tooling** — `scripts/invite-user.mjs` sends invites with the corrected
  redirect; add the callback URL to the project's Redirect URLs allow-list (§6).

## 16. Phase 3.2 — Projects & single-workspace model

The product is organized around **Projects** under a single hidden Malahi tenant.
See `docs/PRODUCT.md` for the product/access model.

- **Migration `20260623130000_projects.sql`** (applied live; history matches): adds
  `projects` (status enum active/draft/completed/archived) + many-to-many join
  tables `project_brands`, `project_products`, `project_locations`, and a
  `project_id` column on `generation_jobs` and `generation_results`, with indexes,
  grants, and a non-destructive **data migration** that moves all pre-existing assets
  into a default **"General"** project. Regenerate types after applying:
  `supabase gen types typescript --linked > src/lib/supabase/database.types.ts`.
- **RLS** for projects + join tables follows the existing membership/role model:
  members read; **owner/admin/editor** write; viewers read-only. The Malahi org
  stays a hidden boundary — there is **no** self-service organization creation
  (the `create_organization` RPC is no longer used by the client).
- **Real-owner reassignment & cleanup (done via service-role admin; no secrets):**
  the real owner was made an active **owner** of the operational Malahi org; an
  empty accidental org (from the old "create workspace" flow) was confirmed empty
  and removed. Only the Malahi org remains. The **synthetic verification owner is
  preserved**; the final handover + synthetic-account removal are deferred until the
  owner confirms access (do not remove it before then; tests then move to temporary
  users).
- **Manifest fix:** the proxy no longer intercepts `/manifest.webmanifest` or the
  icon/metadata routes, so the manifest serves as `application/manifest+json` (200).
- **Tests:** `npm run typecheck` / `lint` / `build`, `npm run test:unit` (incl.
  project repository tests), demo regression (`WV_FORCE_DEMO=1 npx playwright test`),
  and the live suite incl. `e2e/supabase-projects.spec.ts` + `e2e/manifest.spec.ts`
  + `e2e/phase32-screenshots.spec.ts` (`--workers=1`, reads `.env.local`).
