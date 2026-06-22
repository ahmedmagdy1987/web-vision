# Web Vision — Phase 3.1 Review (Live Supabase Connection & Runtime Verification)

Phase 3.1 connected the Phase 3 foundation to a **real, dedicated Supabase project**
and verified it **live**: authentication, Postgres CRUD, RLS / organization
isolation, and private Storage were all exercised against the cloud project. No
secret values appear in this document.

> **Outcome:** a **secured cloud-backed internal beta** — authentication, live
> database persistence, RLS, private Storage, and all critical workflows were
> verified against the real Supabase project. The localStorage demo backend is
> preserved for tests/offline dev; a configured Supabase environment never falls
> back to it silently.

---

## 1. Environment-file recovery

The owner had pasted **real** values (including the privileged service-role key)
into the tracked-looking `.env.example`. Recovery, performed before any commit /
push / migration / build:

- Real values preserved into **`.env.local`** via `cp` (never echoed); the
  Supabase backend explicitly activated there (`NEXT_PUBLIC_DATA_BACKEND=supabase`)
  plus the bootstrap test creds.
- `.env.example` **replaced in place** with a placeholder-only template (the
  privileged key documented as server-only, never `NEXT_PUBLIC_`).
- `.gitignore` gained a `!.env.example` exception so the *template* is committed
  while all real `.env*` files stay ignored.
- Verified: `git check-ignore .env.local` succeeds; `.env.local` is untracked and
  absent from `git status`; `.env.example` contains 0 JWT-like secrets; no secret
  appears in the staged/unstaged diff or any tracked file.

## 2. Git-history secret result

- `.env.example` was **gitignored and untracked** throughout, so the pasted values
  were **never staged, committed, or pushed**. The project ref appears in **0**
  commits across all branches; no tracked file in history contains a JWT.
- **Exposure: NONE (working-tree only). Credential rotation NOT required.**

## 3. Project connection (no secrets)

- Supabase CLI **authenticated** and **linked** to the dedicated project
  **`web-vision-malahi`** (status `ACTIVE_HEALTHY`), matching the `.env.local`
  project URL.
- Backend **activated** via `.env.local`. Production build inspected: the
  service-role key appears **0×** anywhere in `.next` (client *and* server bundles);
  the public anon key is inlined as expected (1×); the `SUPABASE_SERVICE_ROLE_KEY`
  name is absent from client output.

## 4. Migration deployment

Applied to the live DB with `supabase db push --linked`; remote migration history
now matches the repository:

| Migration | Status |
| --- | --- |
| `20260622120000_init_schema.sql` | applied |
| `20260622120100_rls_policies.sql` | applied |
| `20260622120200_storage.sql` | applied |
| `20260623120000_grants.sql` (**new, Phase 3.1**) | applied |

The remote project was empty before push (no prior migrations); no reset or
destructive command was used. The **grants** migration fixes a real gap: the CLI
migration role had not granted DML to `authenticated`/`service_role` (only
`REFERENCES/TRIGGER/TRUNCATE`), which would have blocked the app's `authenticated`
role; it now grants `SELECT/INSERT/UPDATE/DELETE` + `EXECUTE`, with RLS still
governing row access.

## 5. Generated database types

`supabase gen types typescript --linked` was run against the live project; all 14
tables, 6 enums, and the helper/RPC functions match the hand-authored
`src/lib/supabase/database.types.ts`. No meaningful difference → the types were
**not re-committed** (the hand-authored file remains the typed source and provides
the named row exports the repositories import).

## 6. Authentication flow

Email + password via Supabase Auth on the Next.js App Router (`proxy` convention):
unauthenticated requests → `/sign-in`; `/auth/callback` exchanges the code for a
session; `AuthProvider` resolves the session, loads memberships, and publishes the
active org/user to the repository context; the account menu shows the active org
and signs out. Verified live (see §11).

## 7. Owner bootstrap

`scripts/bootstrap-owner.mjs` (idempotent) created a **confirmed** owner/test user
(synthetic `owner@web-vision.test`) via the Admin API with a **crypto-random
password written only to gitignored `.env.local`** (`E2E_TEST_EMAIL` /
`E2E_TEST_PASSWORD`; never committed, printed, or passed as a shell arg). The
`handle_new_user` trigger created the matching `profiles` row (profile id ==
auth user id), and the user was granted **`owner`** membership of the seeded Malahi
organization — verified: auth user, profile, and membership IDs all consistent.

Real-owner process (documented, not a password prompt): create/invite via the
Supabase dashboard or `auth.admin.inviteUserByEmail`, then grant membership or use
the in-app org onboarding (`create_organization` RPC).

## 8. Database CRUD verification (live)

Exercised against the remote DB through the app and authenticated API sessions, with
**reload / fresh-context** checks (optimistic UI not treated as proof):

- **Brands** — create, persists across reload (Supabase-backed); cross-brand /
  cross-org isolation (see §10).
- **Products** — create with brand + category; **image editing reconciled** on
  update (add new, replace primary, remove) with orphan cleanup.
- **Generation jobs/results** — mobile Studio mock generation persists a job +
  result to Postgres and the result object to private Storage; gallery loads it;
  **favorite** and **review (approved/draft)** persist across reload.

## 9. Storage verification (live)

Via the owner's authenticated session (`scripts/verify-asset-ops.mjs`, 4/4):
upload a product asset → **signed URL resolves (HTTP 200)** → replace primary →
delete → **signed URL 404s**. Buckets are private; DB rows store bucket + object
path (never signed URLs); signed URLs are minted on demand; org-scoped,
traversal-safe paths.

## 10. RLS / organization-isolation matrix (live, API-level)

`scripts/rls-matrix.mjs` creates real per-role identities + a second org, asserts
through authenticated PostgREST/Storage sessions, then cleans everything up — **9/9
passed**:

| Check | Result |
| --- | --- |
| viewer A reads org A brands | ✅ allowed |
| viewer A inserts brand | ✅ denied (`42501`) |
| editor A inserts product | ✅ allowed |
| editor A inserts brand (manage-only) | ✅ denied (`42501`) |
| owner B reads org A brands | ✅ 0 rows (isolated) |
| owner B reads org A brand by guessed id | ✅ 0 rows |
| owner B signs org A storage object | ✅ denied |
| no-membership user reads brands | ✅ 0 rows |
| owner A manages (insert brand) | ✅ allowed |

## 11. Test results

| Gate | Result |
| --- | --- |
| `npm run typecheck` | ✅ 0 errors |
| `npm run lint` | ✅ 0 warnings |
| `npm run build` (Supabase + demo) | ✅ success |
| `npm run test:unit` (Vitest) | ✅ 34/34 |
| Live Playwright (`supabase-auth` + `supabase-persistence` + `supabase-smoke`, `--workers=1`) | ✅ **6/6** |
| RLS matrix (`scripts/rls-matrix.mjs`) | ✅ 9/9 |
| Asset storage ops (`scripts/verify-asset-ops.mjs`) | ✅ 4/4 |
| Demo-backend regression (`WV_FORCE_DEMO=1`) | ✅ 40 passed + 5 guarded-skipped |

Live Playwright covered: unauthenticated → `/sign-in`; sign in → protected nav →
sign out; brand CRUD persistence; favorite + review persistence; mobile generation
→ job/result/storage; and **no console/page errors and no horizontal overflow**
across 1440×900, 1280×800, 834×1112, 390×844. No auth redirect loops and no
signed-URL refresh loops were observed.

## 12. Dependency audit

`npm audit` → **2 moderate** advisories: `postcss <8.5.10` (XSS in stringify
output), pulled in transitively by `next@16.2.9`. The only offered fix is
`npm audit fix --force` → `next@9` (a major framework downgrade), which is
**rejected**. The issue is build-time and not reachable at runtime (the app never
stringifies untrusted CSS). **Accepted risk**; it resolves when `next` ships a
patched `postcss`.

## 13. Operational scripts

`scripts/bootstrap-owner.mjs`, `scripts/seed-results.mjs`, `scripts/rls-matrix.mjs`,
`scripts/verify-asset-ops.mjs` — run via `node --env-file=.env.local scripts/<name>.mjs`
(they use the service-role key server-side and never print secrets). See
[`../../docs/SUPABASE.md`](../../docs/SUPABASE.md) §13.

## 14. Known limitations

- **Image generation is still mocked** (`ImageGenerationAdapter`); Phase 4 swaps
  `getImageAdapter()` only — repositories already persist jobs/results.
- **localStorage → Supabase importer** (`src/lib/migration/local-import.ts`) is a
  typed, non-UI utility; an owner-only import screen is deferred.
- **Optimistic writes** are eventually consistent (rollback + toast on failure);
  refresh reflects the true server state.
- **Local-stack dev** (`supabase start`) still needs Docker; live verification used
  the remote project directly.
- 2 moderate transitive npm advisories accepted (§12).

## 15. Commands

```bash
# Development
npm run dev                      # demo backend, or Supabase when .env.local is set

# Quality + unit
npm run typecheck && npm run lint && npm run test:unit

# Production build
npm run build && npm run start

# Demo regression
WV_FORCE_DEMO=1 npm run build && WV_FORCE_DEMO=1 npx playwright test

# Live Supabase verification (after npm run build with .env.local set)
npx playwright test e2e/supabase-auth.spec.ts e2e/supabase-persistence.spec.ts e2e/supabase-smoke.spec.ts --workers=1
node --env-file=.env.local scripts/rls-matrix.mjs
node --env-file=.env.local scripts/verify-asset-ops.mjs
```

## 16. Backup & recovery

- Source + migrations are versioned in the private GitHub repo; `supabase db push`
  (or `supabase db reset` locally) reproduces the schema deterministically.
- Use `supabase db dump` for SQL backups and the managed project's PITR / scheduled
  backups for the database; back up Storage via bucket export (object paths are
  reproducible from DB rows). `.env.local` is the only secret store and is never
  committed — keep it backed up out-of-band.
