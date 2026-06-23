-- Web Vision — Phase 3.2: Projects as the operational organizing layer.
-- Adds projects + project↔asset join tables, project_id on jobs/results, RLS,
-- grants, indexes, and migrates existing data into a default "General" project.
-- Non-destructive and idempotent.

set check_function_bodies = off;

create type public.project_status as enum ('active', 'draft', 'completed', 'archived');

-- ---------------------------------------------------------------------------
-- Projects
-- ---------------------------------------------------------------------------
create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  slug            text not null,
  client_name     text,
  description     text,
  status          public.project_status not null default 'active',
  cover_bucket    text,
  cover_path      text,
  start_date      date,
  notes           text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
create index idx_projects_org on public.projects (organization_id);
create index idx_projects_status on public.projects (status);
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Project ↔ asset relationships (reusable many-to-many)
-- ---------------------------------------------------------------------------
create table public.project_brands (
  project_id uuid not null references public.projects(id) on delete cascade,
  brand_id   uuid not null references public.brands(id) on delete cascade,
  primary key (project_id, brand_id)
);
create index idx_project_brands_brand on public.project_brands (brand_id);

create table public.project_products (
  project_id uuid not null references public.projects(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (project_id, product_id)
);
create index idx_project_products_product on public.project_products (product_id);

create table public.project_locations (
  project_id  uuid not null references public.projects(id) on delete cascade,
  location_id uuid not null references public.locations(id) on delete cascade,
  primary key (project_id, location_id)
);
create index idx_project_locations_location on public.project_locations (location_id);

-- ---------------------------------------------------------------------------
-- Generation jobs/results gain a direct project reference
-- ---------------------------------------------------------------------------
alter table public.generation_jobs
  add column project_id uuid references public.projects(id) on delete set null;
create index idx_jobs_project on public.generation_jobs (project_id);

alter table public.generation_results
  add column project_id uuid references public.projects(id) on delete set null;
create index idx_results_project on public.generation_results (project_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.projects          enable row level security;
alter table public.project_brands    enable row level security;
alter table public.project_products  enable row level security;
alter table public.project_locations enable row level security;

create policy projects_select on public.projects
  for select to authenticated using (public.is_org_member(organization_id));
create policy projects_write on public.projects
  for all to authenticated
  using (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role(organization_id, array['owner','admin','editor']::public.membership_role[]));

create policy project_brands_select on public.project_brands
  for select to authenticated
  using (public.is_org_member((select pr.organization_id from public.projects pr where pr.id = project_id)));
create policy project_brands_write on public.project_brands
  for all to authenticated
  using (public.has_min_role((select pr.organization_id from public.projects pr where pr.id = project_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select pr.organization_id from public.projects pr where pr.id = project_id), array['owner','admin','editor']::public.membership_role[]));

create policy project_products_select on public.project_products
  for select to authenticated
  using (public.is_org_member((select pr.organization_id from public.projects pr where pr.id = project_id)));
create policy project_products_write on public.project_products
  for all to authenticated
  using (public.has_min_role((select pr.organization_id from public.projects pr where pr.id = project_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select pr.organization_id from public.projects pr where pr.id = project_id), array['owner','admin','editor']::public.membership_role[]));

create policy project_locations_select on public.project_locations
  for select to authenticated
  using (public.is_org_member((select pr.organization_id from public.projects pr where pr.id = project_id)));
create policy project_locations_write on public.project_locations
  for all to authenticated
  using (public.has_min_role((select pr.organization_id from public.projects pr where pr.id = project_id), array['owner','admin','editor']::public.membership_role[]))
  with check (public.has_min_role((select pr.organization_id from public.projects pr where pr.id = project_id), array['owner','admin','editor']::public.membership_role[]));

-- ---------------------------------------------------------------------------
-- Grants (match the rest of the schema; RLS still governs rows)
-- ---------------------------------------------------------------------------
grant select, insert, update, delete on
  public.projects, public.project_brands, public.project_products, public.project_locations
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Data migration: default "General" project per org + backfill existing assets
-- ---------------------------------------------------------------------------
insert into public.projects (organization_id, name, slug, status, description)
select o.id, 'General', 'general', 'active', 'Default project holding pre-existing assets.'
from public.organizations o
on conflict (organization_id, slug) do nothing;

insert into public.project_brands (project_id, brand_id)
select p.id, b.id
from public.brands b
join public.projects p on p.organization_id = b.organization_id and p.slug = 'general'
on conflict do nothing;

insert into public.project_products (project_id, product_id)
select p.id, pr.id
from public.products pr
join public.projects p on p.organization_id = pr.organization_id and p.slug = 'general'
on conflict do nothing;

insert into public.project_locations (project_id, location_id)
select p.id, l.id
from public.locations l
join public.projects p on p.organization_id = l.organization_id and p.slug = 'general'
on conflict do nothing;

update public.generation_jobs j
set project_id = p.id
from public.projects p
where p.organization_id = j.organization_id and p.slug = 'general' and j.project_id is null;

update public.generation_results r
set project_id = p.id
from public.projects p
where p.organization_id = r.organization_id and p.slug = 'general' and r.project_id is null;
