-- Web Vision — Phase 3.1: API-role privileges.
--
-- Migrations applied through the Supabase CLI's temporary migration role did not
-- inherit the project default privileges, so the `authenticated` (app) and
-- `service_role` (trusted server) roles were missing DML grants on the public
-- tables. Row access for `authenticated` is still governed entirely by RLS; these
-- grants only give the roles table-level reachability. `anon` deliberately gets
-- no table DML (the app requires authentication; RLS would deny it anyway).

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on all routines in schema public to authenticated, service_role;

-- Future objects created by the migration role inherit the same grants.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;
alter default privileges in schema public
  grant usage, select on sequences to authenticated, service_role;
alter default privileges in schema public
  grant execute on routines to authenticated, service_role;
