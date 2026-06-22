-- Web Vision — Phase 3 development seed (runs via `supabase db reset`).
--
-- Idempotent: fixed UUIDs + `on conflict (id) do nothing`, safe to re-run.
-- Seeds ONE organization, product categories, the 4 demo brands, and a few
-- products + locations so the workspace is reviewable immediately.
--
-- NOT seeded here (created at runtime):
--   * auth.users / passwords — bootstrap an owner separately (see docs:
--     `docs/supabase-setup.md` → "Auth bootstrap"); then add a membership row
--     linking that user to the Malahi org as 'owner'.
--   * brand_assets / product_assets / location_assets / generation_* — these
--     reference private Storage objects that only exist after a real upload or a
--     mock generation, so they are produced by the app, not the seed.

-- Organization -------------------------------------------------------------
insert into public.organizations (id, name, slug) values
  ('00000000-0000-4000-8000-000000000001', 'Malahi Entertainment', 'malahi')
on conflict (id) do nothing;

-- Product categories -------------------------------------------------------
insert into public.product_categories (id, organization_id, name, slug, status) values
  ('00000000-0000-4000-8000-000000000011', '00000000-0000-4000-8000-000000000001', 'Simulators', 'simulators', 'active'),
  ('00000000-0000-4000-8000-000000000012', '00000000-0000-4000-8000-000000000001', 'Arcade',     'arcade',     'active'),
  ('00000000-0000-4000-8000-000000000013', '00000000-0000-4000-8000-000000000001', 'Redemption', 'redemption', 'active'),
  ('00000000-0000-4000-8000-000000000014', '00000000-0000-4000-8000-000000000001', 'Rides',      'rides',      'active'),
  ('00000000-0000-4000-8000-000000000015', '00000000-0000-4000-8000-000000000001', 'Soft Play',  'soft-play',  'active'),
  ('00000000-0000-4000-8000-000000000016', '00000000-0000-4000-8000-000000000001', 'VR',         'vr',         'active'),
  ('00000000-0000-4000-8000-000000000017', '00000000-0000-4000-8000-000000000001', 'Sports',     'sports',     'active')
on conflict (id) do nothing;

-- Brands -------------------------------------------------------------------
insert into public.brands (id, organization_id, name, slug, description, accent_color, instructions, status) values
  ('00000000-0000-4000-8000-000000000021', '00000000-0000-4000-8000-000000000001', 'Malahi Arcade', 'malahi-arcade',
     'Arcade & redemption games for malls and family entertainment centers.', '#7c3aed',
     'Vivid, energetic arcade atmosphere. Emphasize glowing screens, LED marquees and a clean, family-friendly indoor mall setting.', 'active'),
  ('00000000-0000-4000-8000-000000000022', '00000000-0000-4000-8000-000000000001', 'Aventura Parks', 'aventura-parks',
     'Outdoor family rides and open-air attractions.', '#0d9488',
     'Bright natural daylight with outdoor family-park energy. Place rides in safe, spacious open areas.', 'active'),
  ('00000000-0000-4000-8000-000000000023', '00000000-0000-4000-8000-000000000001', 'Nova Play', 'nova-play',
     'Soft play structures and kids entertainment zones.', '#f59e0b',
     'Playful, colorful and safe. Rounded shapes, padded surfaces and warm friendly lighting.', 'active'),
  ('00000000-0000-4000-8000-000000000024', '00000000-0000-4000-8000-000000000001', 'Velocity VR', 'velocity-vr',
     'Immersive VR pods and motion simulators.', '#2563eb',
     'Sleek, futuristic and immersive. Dark ambient spaces with restrained neon accents and premium hardware.', 'active')
on conflict (id) do nothing;

-- Products -----------------------------------------------------------------
insert into public.products
  (id, organization_id, brand_id, category_id, name, slug, description, dimensions, usage, tags, preservation_instructions, status)
values
  ('00000000-0000-4000-8000-000000000031', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021',
     '00000000-0000-4000-8000-000000000012', 'Galaxy Shooter', 'galaxy-shooter',
     'Two-player light-gun arcade cabinet with LED marquee.',
     '{"width":150,"height":220,"depth":110,"unit":"cm"}', 'indoor',
     '{"light-gun","co-op","led"}', 'Preserve the LED marquee artwork and the dual light-gun mounts.', 'active'),
  ('00000000-0000-4000-8000-000000000032', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021',
     '00000000-0000-4000-8000-000000000013', 'Ticket Tower', 'ticket-tower',
     'Vertical skill-stop redemption game with ticket payout.',
     '{"width":90,"height":250,"depth":90,"unit":"cm"}', 'indoor',
     '{"redemption","tickets","skill"}', 'Keep the tall tower silhouette, light columns and ticket dispenser.', 'active'),
  ('00000000-0000-4000-8000-000000000033', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022',
     '00000000-0000-4000-8000-000000000014', 'Sky Spinner', 'sky-spinner',
     'Family spinning ride with eight gondolas.',
     '{"width":1200,"height":900,"depth":1200,"unit":"cm"}', 'outdoor',
     '{"spinning","family","outdoor"}', 'Keep the central tower, eight gondolas and canopy colors.', 'active')
on conflict (id) do nothing;

-- Locations ----------------------------------------------------------------
insert into public.locations
  (id, organization_id, brand_id, name, description, environment_type, preservation_instructions, status)
values
  ('00000000-0000-4000-8000-000000000041', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000021',
     'Grand Mall Atrium', 'Double-height shopping-mall atrium with skylights and polished floors.', 'indoor',
     'Preserve the skylight structure, balconies and floor layout.', 'active'),
  ('00000000-0000-4000-8000-000000000042', '00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000022',
     'Seaside Boardwalk', 'Coastal boardwalk promenade overlooking the sea.', 'outdoor',
     'Keep the timber boardwalk, railings and horizon line.', 'active')
on conflict (id) do nothing;
