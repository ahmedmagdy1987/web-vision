-- Single-org access model. This app IS the internal Malahi system: there is only
-- ever the one canonical Malahi organization. Every Supabase Auth account must
-- automatically become an ACTIVE 'editor' member of it and share the same Logos,
-- Products, Locations and Gallery results. organization_id remains a hidden
-- backend/RLS boundary only.
--
-- This migration:
--   1. Extends the existing on_auth_user_created trigger (handle_new_user) so a
--      membership in the Malahi org is created at signup — idempotent, guarded on
--      the org existing (so signup never fails), and NEVER another organization.
--   2. Backfills existing Auth users that have no membership.
-- Both use `on conflict (organization_id, user_id) do nothing`, so existing
-- owner/admin (or any) memberships are preserved unchanged.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  malahi_id constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  -- Profile (unchanged from the original trigger).
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  -- Auto-membership in the single Malahi org (active, editor). SECURITY DEFINER
  -- bypasses the members_insert RLS policy (which otherwise requires an existing
  -- owner/admin). Guarded on the org existing so a brand-new database without the
  -- seed can never block signup. Idempotent; preserves any existing membership.
  insert into public.organization_members (organization_id, user_id, role, status)
  select malahi_id, new.id, 'editor'::public.membership_role, 'active'::public.membership_status
  where exists (select 1 from public.organizations where id = malahi_id)
  on conflict (organization_id, user_id) do nothing;

  return new;
end;
$$;

-- Backfill: any existing Auth user without a membership in the Malahi org becomes
-- an active editor. The `not exists` guard skips users who already have ANY
-- membership row, so existing owners/admins and their roles are left untouched.
insert into public.organization_members (organization_id, user_id, role, status)
select '00000000-0000-4000-8000-000000000001', u.id,
       'editor'::public.membership_role, 'active'::public.membership_status
from auth.users u
where exists (select 1 from public.organizations where id = '00000000-0000-4000-8000-000000000001')
  and not exists (
    select 1 from public.organization_members m
    where m.organization_id = '00000000-0000-4000-8000-000000000001'
      and m.user_id = u.id
  )
on conflict (organization_id, user_id) do nothing;
