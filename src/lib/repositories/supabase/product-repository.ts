import type { ID, ImageAsset, Product } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { productAssetPath } from "@/lib/storage/paths";
import { createSignedUrls, dataUrlToBlob, removeObjects, uploadObject } from "@/lib/storage/storage-service";
import type { ProductAssetRow, ProductCategoryRow, ProductRow } from "@/lib/supabase/database.types";
import { SupabaseCollection } from "./collection";
import { db, getActiveOrgId, getActiveUserId, requireActiveOrgId } from "./context";
import { productFromRow, slugify, type SignUrl } from "./mappers";
import type { ProductInput, ProductRepositoryApi } from "../types";

interface AssetUpload {
  path: string;
  blob: Blob;
  contentType: string;
  row: {
    id: ID;
    asset_role: "main" | "reference";
    is_primary: boolean;
    sort_order: number;
    mime_type: string;
    width: number | null;
    height: number | null;
    size_bytes: number | null;
  };
}

export class SupabaseProductRepository extends SupabaseCollection<Product> implements ProductRepositoryApi {
  protected label() {
    return "products";
  }

  protected async fetchAll(): Promise<Product[]> {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const supabase = db();
    const [{ data: products, error }, { data: categories, error: catErr }] = await Promise.all([
      supabase.from("products").select("*").eq("organization_id", orgId).order("created_at", { ascending: true }),
      supabase.from("product_categories").select("*").eq("organization_id", orgId),
    ]);
    if (error) throw error;
    if (catErr) throw catErr;
    const rows = (products ?? []) as ProductRow[];
    const cats = (categories ?? []) as ProductCategoryRow[];
    const catName = new Map(cats.map((c) => [c.id, c.name]));

    let assets: ProductAssetRow[] = [];
    if (rows.length) {
      const { data, error: assetErr } = await supabase
        .from("product_assets")
        .select("*")
        .in("product_id", rows.map((p) => p.id));
      if (assetErr) throw assetErr;
      assets = (data ?? []) as ProductAssetRow[];
    }
    const signed = await createSignedUrls(supabase, assets.map((a) => a.storage_path));
    const sign: SignUrl = (p) => signed.get(p) ?? "";
    return rows.map((p) =>
      productFromRow(p, assets.filter((a) => a.product_id === p.id), p.category_id ? catName.get(p.category_id) : undefined, sign),
    );
  }

  /** Find or create a category by name within the active org; returns its id. */
  private async ensureCategory(orgId: ID, name: string): Promise<ID | null> {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const supabase = db();
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

  private buildUploads(orgId: ID, productId: ID, input: ProductInput): AssetUpload[] {
    const uploads: AssetUpload[] = [];
    const pushAsset = (asset: ImageAsset, role: "main" | "reference", isPrimary: boolean, sort: number) => {
      const assetId = newId();
      const { blob } = dataUrlToBlob(asset.url);
      uploads.push({
        path: productAssetPath(orgId, productId, assetId, asset.mimeType),
        blob,
        contentType: asset.mimeType,
        row: {
          id: assetId,
          asset_role: role,
          is_primary: isPrimary,
          sort_order: sort,
          mime_type: asset.mimeType,
          width: asset.width ?? null,
          height: asset.height ?? null,
          size_bytes: asset.size ?? null,
        },
      });
    };
    if (input.mainImage) pushAsset(input.mainImage, "main", true, 0);
    input.referenceImages.forEach((img, i) => pushAsset(img, "reference", false, i + 1));
    return uploads;
  }

  addProduct(input: ProductInput): Product {
    const orgId = requireActiveOrgId();
    const id = newId();
    const ts = nowIso();
    const product: Product = {
      id,
      brandId: input.brandId,
      name: input.name.trim(),
      category: input.category.trim(),
      tags: input.tags,
      description: input.description?.trim() || undefined,
      dimensions: input.dimensions,
      usage: input.usage,
      mainImage: input.mainImage,
      referenceImages: input.referenceImages,
      preservationInstructions: input.preservationInstructions?.trim() || undefined,
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    };
    return this.optimistic({
      apply: () => {
        this.cacheAppend(product);
        return product;
      },
      persist: async () => {
        const supabase = db();
        const categoryId = await this.ensureCategory(orgId, input.category);
        const { error } = await supabase.from("products").insert({
          id,
          organization_id: orgId,
          brand_id: input.brandId,
          category_id: categoryId,
          name: product.name,
          slug: slugify(product.name),
          description: product.description ?? null,
          dimensions: input.dimensions ? JSON.parse(JSON.stringify(input.dimensions)) : null,
          usage: input.usage,
          tags: input.tags,
          preservation_instructions: product.preservationInstructions ?? null,
          status: "active",
          created_by: getActiveUserId(),
        });
        if (error) throw error;

        const uploads = this.buildUploads(orgId, id, input);
        const uploaded: string[] = [];
        try {
          for (const u of uploads) {
            await uploadObject(supabase, { path: u.path, body: u.blob, contentType: u.contentType });
            uploaded.push(u.path);
          }
          if (uploads.length) {
            const { error: assetErr } = await supabase.from("product_assets").insert(
              uploads.map((u) => ({
                id: u.row.id,
                product_id: id,
                asset_role: u.row.asset_role,
                storage_bucket: "web-vision",
                storage_path: u.path,
                mime_type: u.row.mime_type,
                width: u.row.width,
                height: u.row.height,
                size_bytes: u.row.size_bytes,
                sort_order: u.row.sort_order,
                is_primary: u.row.is_primary,
                created_by: getActiveUserId(),
              })),
            );
            if (assetErr) throw assetErr;
          }
        } catch (assetError) {
          if (uploaded.length) await removeObjects(supabase, uploaded);
          throw assetError;
        }
      },
      rollback: () => this.cacheRemove(id),
      context: "create product",
      reconcile: true,
    });
  }

  updateProduct(id: ID, input: Partial<ProductInput>): Product | undefined {
    const orgId = requireActiveOrgId();
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () =>
        this.cacheUpdate(id, (p) => ({
          ...p,
          ...input,
          name: input.name?.trim() ?? p.name,
          category: input.category?.trim() ?? p.category,
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const supabase = db();
        const categoryId =
          input.category !== undefined ? await this.ensureCategory(orgId, input.category) : undefined;
        const { error } = await supabase
          .from("products")
          .update({
            name: input.name?.trim(),
            ...(input.name ? { slug: slugify(input.name) } : {}),
            brand_id: input.brandId,
            ...(categoryId !== undefined ? { category_id: categoryId } : {}),
            description: input.description?.trim() || null,
            dimensions: input.dimensions ? JSON.parse(JSON.stringify(input.dimensions)) : undefined,
            usage: input.usage,
            tags: input.tags,
            preservation_instructions: input.preservationInstructions?.trim() || null,
          })
          .eq("id", id);
        if (error) throw error;
        // Reconcile the image set when the caller supplied one (add new uploads,
        // replace the primary, remove deleted images) with orphan cleanup.
        if (input.referenceImages !== undefined || input.mainImage !== undefined) {
          await this.reconcileAssets(orgId, id, input.mainImage, input.referenceImages ?? []);
        }
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update product",
      reconcile: true,
    });
  }

  /** Diff the desired image set against stored product_assets: upload new ones,
   * update role/primary/order on kept ones, delete removed rows + objects. New
   * images are detected by a data: URL; existing ones keep their asset id. */
  private async reconcileAssets(
    orgId: ID,
    productId: ID,
    mainImage: ProductInput["mainImage"],
    referenceImages: ImageAsset[],
  ): Promise<void> {
    const supabase = db();
    const desired = [
      ...(mainImage ? [{ img: mainImage, role: "main" as const, isPrimary: true, sort: 0 }] : []),
      ...referenceImages.map((img, i) => ({ img, role: "reference" as const, isPrimary: false, sort: i + 1 })),
    ];
    const { data: existingRows } = await supabase.from("product_assets").select("*").eq("product_id", productId);
    const existing = (existingRows ?? []) as ProductAssetRow[];
    const keptIds = new Set(desired.filter((d) => !d.img.url.startsWith("data:")).map((d) => d.img.id));

    const uploaded: string[] = [];
    try {
      // New uploads
      for (const d of desired.filter((x) => x.img.url.startsWith("data:"))) {
        const assetId = newId();
        const path = productAssetPath(orgId, productId, assetId, d.img.mimeType);
        const { blob } = dataUrlToBlob(d.img.url);
        await uploadObject(supabase, { path, body: blob, contentType: d.img.mimeType });
        uploaded.push(path);
        const { error } = await supabase.from("product_assets").insert({
          id: assetId,
          product_id: productId,
          asset_role: d.role,
          storage_bucket: "web-vision",
          storage_path: path,
          mime_type: d.img.mimeType,
          width: d.img.width ?? null,
          height: d.img.height ?? null,
          size_bytes: d.img.size ?? null,
          sort_order: d.sort,
          is_primary: d.isPrimary,
          created_by: getActiveUserId(),
        });
        if (error) throw error;
      }
      // Update kept rows (role/primary/order may have changed)
      for (const d of desired.filter((x) => !x.img.url.startsWith("data:"))) {
        await supabase
          .from("product_assets")
          .update({ asset_role: d.role, is_primary: d.isPrimary, sort_order: d.sort })
          .eq("id", d.img.id);
      }
      // Delete removed rows + their storage objects
      const toDelete = existing.filter((r) => !keptIds.has(r.id));
      if (toDelete.length) {
        await supabase.from("product_assets").delete().in("id", toDelete.map((r) => r.id));
        await removeObjects(supabase, toDelete.map((r) => r.storage_path));
      }
    } catch (e) {
      if (uploaded.length) await removeObjects(supabase, uploaded);
      throw e;
    }
  }

  setStatus(id: ID, status: Product["status"]): Product | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (p) => ({ ...p, status, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("products").update({ status }).eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "archive product",
    });
  }
}
