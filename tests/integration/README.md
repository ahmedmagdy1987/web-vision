# Integration & security verification (Supabase)

These checks require a running Supabase (local via Docker, or a remote project).
They are **not** part of `npm run test:e2e` (which runs against the demo backend)
and are not auto-run by CI — they document how an owner verifies the security
model once Supabase is connected.

## Prerequisites

- Supabase CLI + Docker (for local), or a linked remote project.
- Apply the schema: `supabase db reset` (local) or `supabase db push` (remote).
- `psql` access (local: `supabase status` prints the DB URL).

## 1. RLS + storage policy verification

```bash
psql "$SUPABASE_DB_URL" -f tests/integration/rls.sql
```

`rls.sql` confirms:

- RLS is enabled on **every** `public` table (the assertion query returns 0 rows).
- Every table has at least one policy.
- `storage.objects` has the bucket policies and the `web-vision` bucket is **private**.
- Role behaviour: a **viewer** cannot insert a brand; a **non-member** cannot read
  another org's brands; an **owner/admin** can manage brands; an **editor** can
  create products but not brands; `storage_object_org()` denies traversal paths.

Run the role sections after creating two test users in two orgs (see the comments
in `rls.sql`). Impersonate a user with:

```sql
set local role authenticated;
set local request.jwt.claims = '{"sub":"<USER_UUID>","role":"authenticated"}';
```

## 2. Guarded Playwright suites

`e2e/supabase-auth.spec.ts` and `e2e/supabase-persistence.spec.ts` run only when
Supabase is configured and a seeded test user is supplied; otherwise they skip:

```bash
# After: .env.local configured, `npm run build`, an org + member user seeded
E2E_TEST_EMAIL="qa@malahi.com" E2E_TEST_PASSWORD="••••••" npm run test:e2e
```

They verify: unauthenticated redirect → `/sign-in`, sign in / nav / sign out, and
that brands, favorite/review state, and mock generation jobs persist across reload
through Supabase (not localStorage).

## 3. Unit tests (no Supabase required)

```bash
npm run test:unit
```

Covers the pure logic: db↔domain mappers, storage path generation + traversal
rejection, the permission/role matrix, file validation, aspect-ratio dimension
mapping, and env validation.
