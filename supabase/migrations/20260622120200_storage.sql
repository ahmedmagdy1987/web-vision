-- Web Vision — Phase 3 Supabase foundation
-- Migration 3/4: private storage bucket + object-level RLS.
--
-- Strategy: ONE private bucket ("web-vision") with deterministic, org-scoped
-- folders, which keeps the storage policy model simple and consistent with the
-- table RLS. Object path convention (see src/lib/storage/paths.ts):
--   organizations/{organizationId}/brands/{brandId}/{assetId}.{ext}
--   organizations/{organizationId}/products/{productId}/{assetId}.{ext}
--   organizations/{organizationId}/locations/{locationId}/{assetId}.{ext}
--   organizations/{organizationId}/results/{jobId}/{resultId}.{ext}
--
-- Objects are PRIVATE; previews/downloads are short-lived signed URLs minted by
-- the storage service. The {organizationId} (2nd path segment) drives access.

-- Private bucket with an 8 MB per-object cap and an image-only mime allowlist.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'web-vision', 'web-vision', false, 8388608,
  array['image/png','image/jpeg','image/webp','image/svg+xml','image/gif','image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Extract the organization id from an object path, or null when the path does
-- not match the expected `organizations/{uuid}/...` shape (denied by default).
create or replace function public.storage_object_org(p_name text)
returns uuid language sql immutable set search_path = public, storage as $$
  select case
    when (storage.foldername(p_name))[1] = 'organizations'
         and (storage.foldername(p_name))[2] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then ((storage.foldername(p_name))[2])::uuid
    else null
  end;
$$;

-- Read: any active member of the owning organization.
create policy "web-vision objects: member read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'web-vision'
    and public.is_org_member(public.storage_object_org(name))
  );

-- Write (insert/update/delete): editor and above in the owning organization.
create policy "web-vision objects: editor insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'web-vision'
    and public.has_min_role(public.storage_object_org(name), array['owner','admin','editor']::public.membership_role[])
  );

create policy "web-vision objects: editor update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'web-vision'
    and public.has_min_role(public.storage_object_org(name), array['owner','admin','editor']::public.membership_role[])
  )
  with check (
    bucket_id = 'web-vision'
    and public.has_min_role(public.storage_object_org(name), array['owner','admin','editor']::public.membership_role[])
  );

create policy "web-vision objects: editor delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'web-vision'
    and public.has_min_role(public.storage_object_org(name), array['owner','admin','editor']::public.membership_role[])
  );
