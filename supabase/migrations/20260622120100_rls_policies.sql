-- Web Vision — Phase 3 Supabase foundation
-- Migration 2/4: membership helpers, auth bootstrap, and Row-Level Security.
--
-- Role matrix (per active organization membership):
--   owner  : full control of the organization (incl. members, billing-equivalent)
--   admin  : manage all organization data
--   editor : create/edit operational assets + generation records
--   viewer : read-only
--
-- Authorization is enforced in the DB (RLS), never only in the UI. Privileged
-- service operations use the service-role key strictly server-side.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Membership helper functions (SECURITY DEFINER so they bypass RLS on the
-- membership table and cannot cause recursive policy evaluation).
-- ---------------------------------------------------------------------------
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.organization_members m
    where m.organization_id = p_org
      and m.user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.org_role(p_org uuid)
returns public.membership_role language sql security definer stable set search_path = public as $$
  select m.role
  from public.organization_members m
  where m.organization_id = p_org
    and m.user_id = auth.uid()
    and m.status = 'active'
  limit 1;
$$;

create or replace function public.has_min_role(p_org uuid, p_roles public.membership_role[])
returns boolean language sql security definer stable set search_path = public as $$
  select public.org_role(p_org) = any (p_roles);
$$;

create or replace function public.is_coworker(p_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.organization_members a
    join public.organization_members b on a.organization_id = b.organization_id
    where a.user_id = auth.uid() and a.status = 'active'
      and b.user_id = p_user and b.status = 'active'
  );
$$;

-- ---------------------------------------------------------------------------
-- Auth bootstrap: profile-on-signup trigger + safe organization creation RPC.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Create an organization and make the caller its owner, atomically.
-- This is the only sanctioned path to create an org (no INSERT policy exists),
-- which guarantees every org always has exactly one bootstrapping owner.
create or replace function public.create_organization(p_name text, p_slug text)
returns public.organizations language plpgsql security definer set search_path = public as $$
declare
  v_org public.organizations;
begin
  if auth.uid() is null then
    raise exception 'auth required' using errcode = '28000';
  end if;
  insert into public.organizations (name, slug)
  values (p_name, p_slug)
  returning * into v_org;

  insert into public.organization_members (organization_id, user_id, role, status)
  values (v_org.id, auth.uid(), 'owner', 'active');

  return v_org;
end;
$$;

revoke execute on function public.create_organization(text, text) from anon;
grant  execute on function public.create_organization(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Enable RLS on every user-facing table.
-- ---------------------------------------------------------------------------
alter table public.organizations          enable row level security;
alter table public.profiles               enable row level security;
alter table public.organization_members   enable row level security;
alter table public.brands                 enable row level security;
alter table public.brand_assets           enable row level security;
alter table public.product_categories     enable row level security;
alter table public.products               enable row level security;
alter table public.product_assets         enable row level security;
alter table public.locations              enable row level security;
alter table public.location_assets        enable row level security;
alter table public.generation_presets     enable row level security;
alter table public.generation_jobs        enable row level security;
alter table public.generation_job_products enable row level security;
alter table public.generation_results     enable row level security;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create policy org_select on public.organizations
  for select to authenticated using (public.is_org_member(id));
create policy org_update on public.organizations
  for update to authenticated using (public.has_min_role(id, array['owner','admin']::public.membership_role[]))
  with check (public.has_min_role(id, array['owner','admin']::public.membership_role[]));
create policy org_delete on public.organizations
  for delete to authenticated using (public.org_role(id) = 'owner');

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------
create policy profile_select on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_coworker(id));
create policy profile_insert on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy profile_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- Organization members (owner/admin manage; members can see co-members)
-- ---------------------------------------------------------------------------
create policy members_select on public.organization_members
  for select to authenticated using (public.is_org_member(organization_id));
create policy members_insert on public.organization_members
  for insert to authenticated with check (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy members_update on public.organization_members
  for update to authenticated using (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]));
create policy members_delete on public.organization_members
  for delete to authenticated using (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]));

-- ---------------------------------------------------------------------------
-- Brands + product categories (structural config: owner/admin manage)
-- ---------------------------------------------------------------------------
create policy brands_select on public.brands
  for select to authenticated using (public.is_org_member(organization_id));
create policy brands_write on public.brands
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]));

create policy categories_select on public.product_categories
  for select to authenticated using (public.is_org_member(organization_id));
create policy categories_write on public.product_categories
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin']::public.membership_role[]));

-- ---------------------------------------------------------------------------
-- Operational data (owner/admin/editor write; everyone in org reads)
-- ---------------------------------------------------------------------------
-- Brand assets (logos): org resolved through the parent brand.
create policy brand_assets_select on public.brand_assets
  for select to authenticated
  using (public.is_org_member((select b.organization_id from public.brands b where b.id = brand_id)));
create policy brand_assets_write on public.brand_assets
  for all to authenticated
  using (public.has_min_role((select b.organization_id from public.brands b where b.id = brand_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select b.organization_id from public.brands b where b.id = brand_id), array['owner','admin','editor']::public.membership_role[]));

create policy products_select on public.products
  for select to authenticated using (public.is_org_member(organization_id));
create policy products_write on public.products
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]));

create policy product_assets_select on public.product_assets
  for select to authenticated
  using (public.is_org_member((select p.organization_id from public.products p where p.id = product_id)));
create policy product_assets_write on public.product_assets
  for all to authenticated
  using (public.has_min_role((select p.organization_id from public.products p where p.id = product_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select p.organization_id from public.products p where p.id = product_id), array['owner','admin','editor']::public.membership_role[]));

create policy locations_select on public.locations
  for select to authenticated using (public.is_org_member(organization_id));
create policy locations_write on public.locations
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]));

create policy location_assets_select on public.location_assets
  for select to authenticated
  using (public.is_org_member((select l.organization_id from public.locations l where l.id = location_id)));
create policy location_assets_write on public.location_assets
  for all to authenticated
  using (public.has_min_role((select l.organization_id from public.locations l where l.id = location_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select l.organization_id from public.locations l where l.id = location_id), array['owner','admin','editor']::public.membership_role[]));

create policy presets_select on public.generation_presets
  for select to authenticated using (public.is_org_member(organization_id));
create policy presets_write on public.generation_presets
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]));

create policy jobs_select on public.generation_jobs
  for select to authenticated using (public.is_org_member(organization_id));
create policy jobs_write on public.generation_jobs
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]));

create policy job_products_select on public.generation_job_products
  for select to authenticated
  using (public.is_org_member((select j.organization_id from public.generation_jobs j where j.id = job_id)));
create policy job_products_write on public.generation_job_products
  for all to authenticated
  using (public.has_min_role((select j.organization_id from public.generation_jobs j where j.id = job_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select j.organization_id from public.generation_jobs j where j.id = job_id), array['owner','admin','editor']::public.membership_role[]));

create policy results_select on public.generation_results
  for select to authenticated using (public.is_org_member(organization_id));
create policy results_write on public.generation_results
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]));
