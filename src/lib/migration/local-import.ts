/**
 * One-time, explicitly-triggered importer: copies the prototype's localStorage
 * workspace (brands / products / locations + their base64 image assets) into
 * Supabase Postgres + private Storage for the given organization.
 *
 * Design constraints (see Phase 3 spec §10):
 *  - NEVER runs automatically. The caller (an authorized owner/admin) invokes it.
 *  - Shows a preview/count first via previewLocalData().
 *  - Skips duplicates (same name within the org).
 *  - Uploads base64 data URLs into Storage; stores object paths only.
 *  - Collects per-record failures into `failed[]` instead of throwing.
 *
 * Client-only (reads localStorage + the browser Supabase client). Not wired into
 * any UI — call it from a console/dev action or a future admin screen.
 */
import type { Brand, ImageAsset, Location, Product } from "@/lib/domain";
import { newId } from "@/lib/ids";
import { storage } from "@/lib/repositories/storage";
import { brandAssetPath, locationAssetPath, productAssetPath } from "@/lib/storage/paths";
import { dataUrlToBlob, uploadObject, type WvSupabaseClient } from "@/lib/storage/storage-service";
import { slugify } from "@/lib/repositories/supabase/mappers";
import { getBrowserSupabase } from "@/lib/supabase/client";

export interface LocalDataCounts {
  brands: number;
  products: number;
  locations: number;
  results: number;
}

export interface ImportResult {
  imported: { brands: number; products: number; locations: number };
  skipped: number;
  failed: string[];
}

function read<T>(key: string): T[] {
  return storage.get<T[]>(key) ?? [];
}

/** Count what the importer would consider, without writing anything. */
export function previewLocalData(): LocalDataCounts {
  return {
    brands: read<Brand>("brands").length,
    products: read<Product>("products").length,
    locations: read<Location>("locations").length,
    results: read<unknown>("results").length,
  };
}

function isDataUrl(url: string | undefined): url is string {
  return typeof url === "string" && url.startsWith("data:");
}

async function uploadImage(
  supabase: WvSupabaseClient,
  asset: ImageAsset,
  path: string,
): Promise<{ width: number | null; height: number | null; size: number | null }> {
  const { blob } = dataUrlToBlob(asset.url);
  await uploadObject(supabase, { path, body: blob, contentType: asset.mimeType, upsert: true });
  return { width: asset.width ?? null, height: asset.height ?? null, size: asset.size ?? null };
}

async function ensureCategory(supabase: WvSupabaseClient, orgId: string, name: string): Promise<string | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const slug = slugify(trimmed);
  const { data: existing } = await supabase
    .from("product_categories")
    .select("id")
    .eq("organization_id", orgId)
    .eq("slug", slug)
    .maybeSingle();
  if (existing?.id) return existing.id;
  const id = newId();
  const { error } = await supabase
    .from("product_categories")
    .insert({ id, organization_id: orgId, name: trimmed, slug, status: "active" });
  if (error) throw error;
  return id;
}

/**
 * Import local brands → products → locations into Supabase for `orgId`.
 * Returns counts of imported records and a list of human-readable failures.
 */
export async function importLocalData(orgId: string): Promise<ImportResult> {
  const supabase = getBrowserSupabase();
  const result: ImportResult = { imported: { brands: 0, products: 0, locations: 0 }, skipped: 0, failed: [] };

  const localBrands = read<Brand>("brands");
  const localProducts = read<Product>("products");
  const localLocations = read<Location>("locations");

  // Existing names (lower-cased) for dedupe + a localBrandId → supabaseBrandId map.
  const { data: existingBrands } = await supabase.from("brands").select("id, name").eq("organization_id", orgId);
  const brandIdByName = new Map<string, string>();
  for (const b of existingBrands ?? []) brandIdByName.set(b.name.toLowerCase(), b.id);

  // ----- Brands + logos -----
  const localToSupaBrand = new Map<string, string>();
  for (const brand of localBrands) {
    const key = brand.name.toLowerCase();
    if (brandIdByName.has(key)) {
      localToSupaBrand.set(brand.id, brandIdByName.get(key)!);
      result.skipped++;
      continue;
    }
    try {
      const brandId = newId();
      const { error } = await supabase.from("brands").insert({
        id: brandId,
        organization_id: orgId,
        name: brand.name,
        slug: slugify(brand.name),
        description: brand.description ?? null,
        accent_color: brand.accentColor,
        instructions: brand.instructions ?? null,
        status: brand.status,
      });
      if (error) throw error;

      let defaultAssetId: string | null = null;
      for (const lg of brand.logos) {
        if (!isDataUrl(lg.asset.url)) continue;
        const assetId = newId();
        const path = brandAssetPath(orgId, brandId, assetId, lg.asset.mimeType);
        const dims = await uploadImage(supabase, lg.asset, path);
        const isDefault = lg.id === brand.defaultLogoId || defaultAssetId === null;
        if (isDefault) defaultAssetId = assetId;
        const { error: assetErr } = await supabase.from("brand_assets").insert({
          id: assetId,
          brand_id: brandId,
          asset_type: lg.kind,
          name: lg.asset.name,
          storage_bucket: "web-vision",
          storage_path: path,
          mime_type: lg.asset.mimeType,
          width: dims.width,
          height: dims.height,
          size_bytes: dims.size,
          is_default: isDefault,
          status: lg.status,
          instructions: lg.instructions ?? null,
        });
        if (assetErr) throw assetErr;
      }
      if (defaultAssetId) await supabase.from("brands").update({ default_logo_id: defaultAssetId }).eq("id", brandId);

      brandIdByName.set(key, brandId);
      localToSupaBrand.set(brand.id, brandId);
      result.imported.brands++;
    } catch (e) {
      result.failed.push(`brand "${brand.name}": ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  // ----- Products -----
  const { data: existingProducts } = await supabase.from("products").select("name").eq("organization_id", orgId);
  const productNames = new Set((existingProducts ?? []).map((p) => p.name.toLowerCase()));
  for (const product of localProducts) {
    if (productNames.has(product.name.toLowerCase())) {
      result.skipped++;
      continue;
    }
    const brandId = localToSupaBrand.get(product.brandId) ?? brandIdByName.get(product.brandId.toLowerCase());
    if (!brandId) {
      result.failed.push(`product "${product.name}": no matching brand`);
      continue;
    }
    try {
      const productId = newId();
      const categoryId = await ensureCategory(supabase, orgId, product.category);
      const { error } = await supabase.from("products").insert({
        id: productId,
        organization_id: orgId,
        brand_id: brandId,
        category_id: categoryId,
        name: product.name,
        slug: slugify(product.name),
        description: product.description ?? null,
        dimensions: product.dimensions ? JSON.parse(JSON.stringify(product.dimensions)) : null,
        usage: product.usage,
        tags: product.tags,
        preservation_instructions: product.preservationInstructions ?? null,
        status: product.status,
      });
      if (error) throw error;

      const images: Array<{ asset: ImageAsset; role: "main" | "reference"; primary: boolean; sort: number }> = [];
      if (product.mainImage && isDataUrl(product.mainImage.url)) images.push({ asset: product.mainImage, role: "main", primary: true, sort: 0 });
      product.referenceImages.forEach((img, i) => {
        if (isDataUrl(img.url)) images.push({ asset: img, role: "reference", primary: false, sort: i + 1 });
      });
      for (const im of images) {
        const assetId = newId();
        const path = productAssetPath(orgId, productId, assetId, im.asset.mimeType);
        const dims = await uploadImage(supabase, im.asset, path);
        const { error: assetErr } = await supabase.from("product_assets").insert({
          id: assetId,
          product_id: productId,
          asset_role: im.role,
          storage_bucket: "web-vision",
          storage_path: path,
          mime_type: im.asset.mimeType,
          width: dims.width,
          height: dims.height,
          size_bytes: dims.size,
          sort_order: im.sort,
          is_primary: im.primary,
        });
        if (assetErr) throw assetErr;
      }
      productNames.add(product.name.toLowerCase());
      result.imported.products++;
    } catch (e) {
      result.failed.push(`product "${product.name}": ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  // ----- Locations -----
  const { data: existingLocations } = await supabase.from("locations").select("name").eq("organization_id", orgId);
  const locationNames = new Set((existingLocations ?? []).map((l) => l.name.toLowerCase()));
  for (const location of localLocations) {
    if (locationNames.has(location.name.toLowerCase())) {
      result.skipped++;
      continue;
    }
    try {
      const locationId = newId();
      const brandId = location.brandId
        ? localToSupaBrand.get(location.brandId) ?? brandIdByName.get(location.brandId.toLowerCase()) ?? null
        : null;
      const { error } = await supabase.from("locations").insert({
        id: locationId,
        organization_id: orgId,
        brand_id: brandId,
        name: location.name,
        description: location.description ?? null,
        environment_type: location.usage,
        preservation_instructions: location.preservationInstructions ?? null,
        status: "active",
      });
      if (error) throw error;

      let mainAssetId: string | null = null;
      for (let i = 0; i < location.images.length; i++) {
        const img = location.images[i];
        if (!isDataUrl(img.url)) continue;
        const assetId = newId();
        const path = locationAssetPath(orgId, locationId, assetId, img.mimeType);
        const dims = await uploadImage(supabase, img, path);
        const isPrimary = img.id === location.mainImageId || mainAssetId === null;
        if (isPrimary) mainAssetId = assetId;
        const { error: assetErr } = await supabase.from("location_assets").insert({
          id: assetId,
          location_id: locationId,
          storage_bucket: "web-vision",
          storage_path: path,
          mime_type: img.mimeType,
          width: dims.width,
          height: dims.height,
          size_bytes: dims.size,
          sort_order: i,
          is_primary: isPrimary,
        });
        if (assetErr) throw assetErr;
      }
      if (mainAssetId) await supabase.from("locations").update({ main_image_id: mainAssetId }).eq("id", locationId);

      locationNames.add(location.name.toLowerCase());
      result.imported.locations++;
    } catch (e) {
      result.failed.push(`location "${location.name}": ${e instanceof Error ? e.message : "failed"}`);
    }
  }

  return result;
}
