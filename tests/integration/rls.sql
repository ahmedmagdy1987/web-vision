-- Web Vision Phase 3 — RLS verification queries.
-- Run against a local (`supabase db reset` + `supabase start`) or remote project
-- with psql. These are NOT executed by CI; they document how to confirm the
-- security model. See tests/integration/README.md for setup.

-- ===========================================================================
-- 1. RLS is enabled on EVERY user-facing public table.
--    Expect: rls_enabled = true for all rows.
-- ===========================================================================
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by c.relname;

-- Quick assertion: this should return ZERO rows (no public table without RLS).
select c.relname
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity = false;

-- ===========================================================================
-- 2. Every table has at least one policy.
-- ===========================================================================
select schemaname, tablename, count(*) as policy_count
from pg_policies
where schemaname = 'public'
group by 1, 2
order by tablename;

-- ===========================================================================
-- 3. Storage policies exist on storage.objects for the private bucket.
-- ===========================================================================
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;

select id, public, file_size_limit from storage.buckets where id = 'web-vision';
-- Expect: public = false.

-- ===========================================================================
-- 4. Role behaviour — simulate two users in two orgs.
--    Replace the UUIDs below with real auth.users ids (or seed test users).
--    The pattern impersonates a user by setting the JWT claims PostgREST uses.
-- ===========================================================================
-- Setup (run as the privileged migration role):
--   insert into auth.users ... (or create via the Auth API)
--   select public.create_organization('Org A','org-a');  -- as user A (owner)
--   select public.create_organization('Org B','org-b');  -- as user B (owner)
--   -- add user C to Org A as 'viewer'.

-- Impersonate a user for the session:
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<USER_UUID>","role":"authenticated"}';

-- 4a. A VIEWER cannot insert a brand (expect: 0 rows / permission error).
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<VIEWER_UUID>","role":"authenticated"}';
-- insert into public.brands (organization_id, name, slug, accent_color)
--   values ('<ORG_A_UUID>', 'Nope', 'nope', '#6d28d9');   -- EXPECT: RLS violation

-- 4b. A NON-MEMBER cannot read another org's brands (expect: 0 rows).
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<USER_B_UUID>","role":"authenticated"}';
-- select count(*) from public.brands where organization_id = '<ORG_A_UUID>';  -- EXPECT: 0

-- 4c. An OWNER/ADMIN can manage brands (expect: success).
-- set local role authenticated;
-- set local request.jwt.claims = '{"sub":"<OWNER_A_UUID>","role":"authenticated"}';
-- insert into public.brands (organization_id, name, slug, accent_color)
--   values ('<ORG_A_UUID>', 'Owner Brand', 'owner-brand', '#6d28d9');  -- EXPECT: ok

-- 4d. An EDITOR can create products but NOT brands.
-- set local request.jwt.claims = '{"sub":"<EDITOR_A_UUID>","role":"authenticated"}';
-- insert into public.products (organization_id, brand_id, name, slug)
--   values ('<ORG_A_UUID>', '<BRAND_A_UUID>', 'Editor Product', 'editor-product');  -- EXPECT: ok
-- insert into public.brands (organization_id, name, slug, accent_color)
--   values ('<ORG_A_UUID>', 'X', 'x', '#6d28d9');  -- EXPECT: RLS violation

-- 4e. Storage path authorization helper returns the org only for valid paths.
select public.storage_object_org('organizations/00000000-0000-0000-0000-000000000001/brands/x/y.png'); -- uuid
select public.storage_object_org('evil/../secret.png'); -- NULL (denied)

-- Reset impersonation:
-- reset role; reset request.jwt.claims;
