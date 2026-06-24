# Phase 3.3 — Vercel production deployment (review)

Phase 3.3 takes the Phase 3.2 verified application state (single-workspace
Projects & Locations model, live Supabase backend) and ships it to a real Vercel
production deployment, with production environment configuration and the Supabase
Auth redirect allow-list wired for the production origin.

This phase was completed as part of a **post–Deep Freeze recovery**: the local
machine had been reset, so the project was rebuilt from the authoritative GitHub
state and the preserved local `.env.local` before the deployment was resumed.

## Production deployment

| Item | Value |
| --- | --- |
| Vercel project | `web-vision-malahi` (`prj_EDhJy4vUi4HUI2EXwubnDgRXAZfc`) |
| Team / scope | Ahmed Magdy's projects (`team_41lMhrS4wHw1Z3bzxGlirJop`) |
| Framework | Next.js (16.2.9), project root = repo root (`.`) |
| Production branch | `main` |
| Build command | `npm run build` |
| Production URL | https://web-vision-malahi.vercel.app |
| App backend | Supabase (live) — **no demo/localStorage fallback** |

Exactly one Vercel project is used; no duplicate project was created. The local
repository is linked to the existing project (`.vercel/` is gitignored).

## Production environment variables

Only the required **runtime** variables are configured in Vercel (Production),
copied from the local environment contract (`.env.example`):

| Variable | Exposure | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | public | existing linked Supabase project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | anon/publishable key |
| `NEXT_PUBLIC_DATA_BACKEND` | public | `supabase` (forces the cloud backend) |
| `NEXT_PUBLIC_SITE_URL` | public | `https://web-vision-malahi.vercel.app` (HTTPS, not localhost) |

Deliberately **not** transferred to Vercel:

- `SUPABASE_SERVICE_ROLE_KEY` — the privileged server-only key is **not used by any
  runtime code path** (`getAdminSupabase()` has no call sites; it exists only for
  manual/dev tasks), so it is not required in production and is omitted to minimise
  the privileged-key surface. It is never prefixed with `NEXT_PUBLIC_`.
- `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` — test credentials, never deployed.
- Database password, CLI tokens, and other local-only values.

## Deployment-blocking bug found and fixed: BOM in env values

The production deployment created during the original (interrupted) Phase 3.3 had a
latent, silent bug: the `NEXT_PUBLIC_*` environment values stored in Vercel began
with a **UTF-8 byte-order-mark (U+FEFF)**. Because `NEXT_PUBLIC_*` values are inlined
into the client bundle at build time, the deployed bundle carried the BOM in the
Supabase anon key. In the browser, the Supabase client builds an `apikey` /
`Authorization` request header from that value, and the browser rejects it:

```
TypeError: Failed to read the 'headers' property from 'RequestInit':
String contains non ISO-8859-1 code point.
```

The request was never sent, so **every production sign-in failed** with the
app's generic "Incorrect email or password." message — even though the
credentials, the anon key, and the Supabase project were all valid (a direct
Supabase Auth API call with the same key + credentials returned `200`). Local
builds were unaffected because Next/dotenv strips a BOM from `.env.local`.

**Fix:** the four production `NEXT_PUBLIC_*` variables were re-set to clean,
ASCII-only, BOM-free values via the Vercel REST API (a JSON body avoids any shell
encoding artifacts), verified at rest (first byte of the anon key = `e`, not a
BOM), and production was rebuilt with the build cache disabled. The served bundle
now contains the anon key with no preceding BOM, and production sign-in succeeds.

## Supabase Auth — production redirect allow-list

Per `docs/SUPABASE.md` §6, the project's **Authentication → URL Configuration** must
be set for the production origin (owner-confirmed):

- **Site URL:** `https://web-vision-malahi.vercel.app`
- **Redirect URLs (allow-list):**
  - `https://web-vision-malahi.vercel.app/auth/callback`
  - `http://localhost:3000/auth/callback` (local dev)
  - `http://localhost:3210/auth/callback` (Playwright/E2E)

Production auth redirects are all relative (`/sign-in?redirect=…`); **no production
redirect points to localhost**.

## Verification

Build & quality gates (clean checkout, restored deps):

- `npm ci` ✓ · `tsc --noEmit` ✓ · `eslint` ✓ · `vitest run` — **37/37** ✓
- `next build` ✓ (both demo and live-Supabase modes; 17 routes; proxy/middleware active)

Live Supabase (local production server, `Data backend: supabase`):

- `supabase-auth` + `supabase-smoke` ✓ — sign-in / session / protected nav / sign-out,
  all routes across desktop/laptop/tablet/mobile, no console or page errors.

Supabase migrations — local ↔ remote **aligned** (no reset, no push performed):

```
20260622120000  20260622120100  20260622120200  20260623120000  20260623130000
```

Production (https://web-vision-malahi.vercel.app):

- Unauthenticated protected routes (`/`, `/projects`, `/identity`, `/products`,
  `/locations`, `/studio`, `/gallery`, `/gallery/[id]`) → `307` → `/sign-in?redirect=…` ✓
- `/sign-in` `200`; `/manifest.webmanifest` `200` valid JSON ("Web Vision — Malahi");
  `/icon.svg` `200`; `/apple-icon` `200` ✓
- Authenticated `supabase-auth` + `supabase-smoke` E2E **green against the live HTTPS
  deployment** — sign-in, session, protected navigation, sign-out, all routes,
  responsive layouts, no console/page errors ✓
- Existing Malahi data remains remote and untouched; private Storage previews load
  via the gallery; backend is Supabase (no silent demo fallback) ✓

## Remaining limitation

Image generation remains **mocked** (`src/lib/services/image-adapter`); no real image
provider is called. This is unchanged from earlier phases and is deferred to Phase 4.
