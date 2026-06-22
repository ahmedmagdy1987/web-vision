-- Web Vision — Phase 3 Supabase foundation
-- Migration 1/4: core schema (organizations, profiles, memberships, brands,
-- products, locations, presets, generation jobs/results) for a multi-brand
-- internal workspace. RLS is enabled in a later migration (20260622120100).
--
-- Conventions:
--  * UUID primary keys via gen_random_uuid()
--  * timestamptz created_at/updated_at, updated_at maintained by a trigger
--  * structured generation settings / snapshots stored as jsonb
--  * private storage object references stored as (storage_bucket, storage_path);
--    NEVER store signed URLs — they are resolved on demand by the storage service.

set check_function_bodies = off;

-- ---------------------------------------------------------------------------
-- Enums (mirror the existing domain unions so the DB validates them too)
-- ---------------------------------------------------------------------------
create type public.membership_role   as enum ('owner', 'admin', 'editor', 'viewer');
create type public.membership_status as enum ('active', 'invited', 'suspended');
create type public.entity_status     as enum ('active', 'archived');
-- LogoKind: primary | secondary | icon | light | dark
create type public.brand_asset_type  as enum ('primary', 'secondary', 'icon', 'light', 'dark');
-- Domain JobStatus is queued|processing|completed|failed; draft|cancelled are
-- reserved here for the documented full flow and future provider lifecycles.
create type public.job_status        as enum ('draft', 'queued', 'processing', 'completed', 'failed', 'cancelled');
create type public.review_status     as enum ('draft', 'approved', 'rejected');

-- ---------------------------------------------------------------------------
-- updated_at trigger helper
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Organizations
-- ---------------------------------------------------------------------------
create table public.organizations (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(trim(name)) > 0),
  slug       text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profiles (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Organization memberships
-- ---------------------------------------------------------------------------
create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            public.membership_role   not null default 'viewer',
  status          public.membership_status not null default 'active',
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index idx_members_user on public.organization_members (user_id);
create index idx_members_org  on public.organization_members (organization_id);

-- ---------------------------------------------------------------------------
-- Brands
-- ---------------------------------------------------------------------------
create table public.brands (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  slug            text not null,
  description     text,
  accent_color    text not null default '#6d28d9' check (accent_color ~* '^#[0-9a-f]{6}$'),
  instructions    text,
  status          public.entity_status not null default 'active',
  -- default logo FK added after brand_assets exists (circular dependency)
  default_logo_id uuid,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
create index idx_brands_org on public.brands (organization_id);
create trigger trg_brands_updated before update on public.brands
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Brand assets (logos: primary/secondary/icon/light/dark)
-- ---------------------------------------------------------------------------
create table public.brand_assets (
  id             uuid primary key default gen_random_uuid(),
  brand_id       uuid not null references public.brands(id) on delete cascade,
  asset_type     public.brand_asset_type not null,
  name           text not null,
  storage_bucket text not null default 'web-vision',
  storage_path   text not null,
  mime_type      text not null,
  width          integer,
  height         integer,
  size_bytes     bigint,
  is_default     boolean not null default false,
  status         public.entity_status not null default 'active',
  instructions   text,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (brand_id, storage_bucket, storage_path)
);
create index idx_brand_assets_brand on public.brand_assets (brand_id);
create trigger trg_brand_assets_updated before update on public.brand_assets
  for each row execute function public.set_updated_at();

-- Now wire the brand's default logo to a real asset.
alter table public.brands
  add constraint brands_default_logo_fk
  foreign key (default_logo_id) references public.brand_assets(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Product categories
-- ---------------------------------------------------------------------------
create table public.product_categories (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  slug            text not null,
  status          public.entity_status not null default 'active',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (organization_id, slug)
);
create index idx_categories_org on public.product_categories (organization_id);
create trigger trg_categories_updated before update on public.product_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table public.products (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  brand_id                 uuid not null references public.brands(id) on delete cascade,
  category_id              uuid references public.product_categories(id) on delete set null,
  name                     text not null check (length(trim(name)) > 0),
  slug                     text not null,
  description              text,
  dimensions               jsonb,
  usage                    text not null default 'both' check (usage in ('indoor', 'outdoor', 'both')),
  tags                     text[] not null default '{}',
  preservation_instructions text,
  status                   public.entity_status not null default 'active',
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (brand_id, slug)
);
create index idx_products_org      on public.products (organization_id);
create index idx_products_brand    on public.products (brand_id);
create index idx_products_category on public.products (category_id);
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Product assets (main + reference images)
-- ---------------------------------------------------------------------------
create table public.product_assets (
  id             uuid primary key default gen_random_uuid(),
  product_id     uuid not null references public.products(id) on delete cascade,
  asset_role     text not null default 'reference' check (asset_role in ('main', 'reference')),
  storage_bucket text not null default 'web-vision',
  storage_path   text not null,
  mime_type      text not null,
  width          integer,
  height         integer,
  size_bytes     bigint,
  sort_order     integer not null default 0,
  is_primary     boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (product_id, storage_bucket, storage_path)
);
create index idx_product_assets_product on public.product_assets (product_id);

-- ---------------------------------------------------------------------------
-- Locations (LocationUsage indoor|outdoor -> environment_type)
-- ---------------------------------------------------------------------------
create table public.locations (
  id                       uuid primary key default gen_random_uuid(),
  organization_id          uuid not null references public.organizations(id) on delete cascade,
  brand_id                 uuid references public.brands(id) on delete set null,
  name                     text not null check (length(trim(name)) > 0),
  description              text,
  environment_type         text not null default 'indoor' check (environment_type in ('indoor', 'outdoor')),
  dimensions               jsonb,
  preservation_instructions text,
  status                   public.entity_status not null default 'active',
  main_image_id            uuid,
  created_by               uuid references auth.users(id) on delete set null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index idx_locations_org   on public.locations (organization_id);
create index idx_locations_brand on public.locations (brand_id);
create trigger trg_locations_updated before update on public.locations
  for each row execute function public.set_updated_at();

create table public.location_assets (
  id             uuid primary key default gen_random_uuid(),
  location_id    uuid not null references public.locations(id) on delete cascade,
  storage_bucket text not null default 'web-vision',
  storage_path   text not null,
  mime_type      text not null,
  width          integer,
  height         integer,
  size_bytes     bigint,
  sort_order     integer not null default 0,
  is_primary     boolean not null default false,
  created_by     uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (location_id, storage_bucket, storage_path)
);
create index idx_location_assets_location on public.location_assets (location_id);

alter table public.locations
  add constraint locations_main_image_fk
  foreign key (main_image_id) references public.location_assets(id) on delete set null;

-- ---------------------------------------------------------------------------
-- Generation presets
-- ---------------------------------------------------------------------------
create table public.generation_presets (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id        uuid references public.brands(id) on delete cascade,
  name            text not null check (length(trim(name)) > 0),
  settings        jsonb not null,
  status          public.entity_status not null default 'active',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index idx_presets_org   on public.generation_presets (organization_id);
create index idx_presets_brand on public.generation_presets (brand_id);
create trigger trg_presets_updated before update on public.generation_presets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Generation jobs
-- ---------------------------------------------------------------------------
create table public.generation_jobs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  brand_id        uuid references public.brands(id) on delete set null,
  location_id     uuid references public.locations(id) on delete set null,
  status          public.job_status not null default 'queued',
  progress        integer not null default 0 check (progress between 0 and 100),
  request         jsonb not null,
  instructions    jsonb,
  provider        text not null default 'mock',
  provider_job_id text,
  error_code      text,
  error_message   text,
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  started_at      timestamptz,
  completed_at    timestamptz,
  updated_at      timestamptz not null default now()
);
create index idx_jobs_org    on public.generation_jobs (organization_id);
create index idx_jobs_brand  on public.generation_jobs (brand_id);
create index idx_jobs_status on public.generation_jobs (status);
create trigger trg_jobs_updated before update on public.generation_jobs
  for each row execute function public.set_updated_at();

-- Job <-> selected products relation
create table public.generation_job_products (
  job_id     uuid not null references public.generation_jobs(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  primary key (job_id, product_id)
);
create index idx_job_products_product on public.generation_job_products (product_id);

-- ---------------------------------------------------------------------------
-- Generation results
-- ---------------------------------------------------------------------------
create table public.generation_results (
  id                uuid primary key default gen_random_uuid(),
  job_id            uuid not null references public.generation_jobs(id) on delete cascade,
  -- denormalized for cheap RLS + gallery filtering / indexing
  organization_id   uuid not null references public.organizations(id) on delete cascade,
  storage_bucket    text not null default 'web-vision',
  storage_path      text not null,
  mime_type         text not null,
  width             integer,
  height            integer,
  aspect_ratio      text,
  seed              bigint,
  result_index      integer not null default 0,
  review_status     public.review_status not null default 'draft',
  is_favorite       boolean not null default false,
  snapshot          jsonb not null,
  provider_metadata jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index idx_results_job      on public.generation_results (job_id);
create index idx_results_org      on public.generation_results (organization_id);
create index idx_results_review   on public.generation_results (review_status);
create index idx_results_favorite on public.generation_results (is_favorite) where is_favorite;
create trigger trg_results_updated before update on public.generation_results
  for each row execute function public.set_updated_at();
