import type { Brand, ID, ImageAsset, LogoAsset, LogoStatus } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { brandAssetPath } from "@/lib/storage/paths";
import { createSignedUrls, dataUrlToBlob, removeObjects, uploadObject } from "@/lib/storage/storage-service";
import type { BrandAssetRow, BrandRow } from "@/lib/supabase/database.types";
import { SupabaseCollection } from "./collection";
import { db, getActiveOrgId, getActiveUserId, requireActiveOrgId } from "./context";
import { brandFromRow, slugify, type SignUrl } from "./mappers";
import type { BrandRepositoryApi, CreateBrandInput, CreateLogoInput } from "../types";

export class SupabaseBrandRepository extends SupabaseCollection<Brand> implements BrandRepositoryApi {
  protected label() {
    return "brands";
  }

  protected async fetchAll(): Promise<Brand[]> {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const supabase = db();
    const { data: brands, error } = await supabase
      .from("brands")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (brands ?? []) as BrandRow[];

    let assets: BrandAssetRow[] = [];
    if (rows.length) {
      const { data, error: assetErr } = await supabase
        .from("brand_assets")
        .select("*")
        .in("brand_id", rows.map((b) => b.id));
      if (assetErr) throw assetErr;
      assets = (data ?? []) as BrandAssetRow[];
    }

    const signed = await createSignedUrls(supabase, assets.map((a) => a.storage_path));
    const sign: SignUrl = (p) => signed.get(p) ?? "";
    return rows.map((b) => brandFromRow(b, assets.filter((a) => a.brand_id === b.id), sign));
  }

  addBrand(input: CreateBrandInput): Brand {
    const orgId = requireActiveOrgId();
    const id = newId();
    const ts = nowIso();
    const brand: Brand = {
      id,
      name: input.name.trim(),
      accentColor: input.accentColor,
      description: input.description?.trim() || undefined,
      instructions: input.instructions?.trim() || undefined,
      logos: [],
      defaultLogoId: undefined,
      status: "active",
      createdAt: ts,
      updatedAt: ts,
    };
    return this.optimistic({
      apply: () => {
        this.cacheAppend(brand);
        return brand;
      },
      persist: async () => {
        const { error } = await db().from("brands").insert({
          id,
          organization_id: orgId,
          name: brand.name,
          slug: slugify(brand.name),
          description: brand.description ?? null,
          accent_color: brand.accentColor,
          instructions: brand.instructions ?? null,
          status: "active",
          created_by: getActiveUserId(),
        });
        if (error) throw error;
      },
      rollback: () => this.cacheRemove(id),
      context: "create brand",
    });
  }

  updateBrand(
    id: ID,
    patch: Partial<Pick<Brand, "name" | "accentColor" | "description" | "instructions">>,
  ): Brand | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () =>
        this.cacheUpdate(id, (b) => ({
          ...b,
          ...patch,
          name: patch.name?.trim() ?? b.name,
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const { error } = await db()
          .from("brands")
          .update({
            name: patch.name?.trim(),
            accent_color: patch.accentColor,
            description: patch.description?.trim() || null,
            instructions: patch.instructions?.trim() || null,
            ...(patch.name ? { slug: slugify(patch.name) } : {}),
          })
          .eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update brand",
    });
  }

  setStatus(id: ID, status: Brand["status"]): Brand | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (b) => ({ ...b, status, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("brands").update({ status }).eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "archive brand",
    });
  }

  addLogo(brandId: ID, input: CreateLogoInput): LogoAsset | undefined {
    const orgId = requireActiveOrgId();
    const brand = this.getById(brandId);
    if (!brand) return undefined;
    const assetId = newId();
    const ts = nowIso();
    const path = brandAssetPath(orgId, brandId, assetId, input.asset.mimeType);
    const logo: LogoAsset = {
      id: assetId,
      brandId,
      asset: { ...input.asset, id: assetId },
      kind: input.kind,
      status: "active",
      instructions: input.instructions?.trim() || undefined,
      createdAt: ts,
      updatedAt: ts,
    };
    const isFirst = brand.logos.length === 0;
    this.optimistic({
      apply: () =>
        this.cacheUpdate(brandId, (b) => ({
          ...b,
          logos: [...b.logos, logo],
          defaultLogoId: b.defaultLogoId ?? logo.id,
          updatedAt: ts,
        })),
      persist: async () => {
        const supabase = db();
        const { blob } = dataUrlToBlob(input.asset.url);
        await uploadObject(supabase, { path, body: blob, contentType: input.asset.mimeType });
        const { error } = await supabase.from("brand_assets").insert({
          id: assetId,
          brand_id: brandId,
          asset_type: input.kind,
          name: input.asset.name,
          storage_bucket: "web-vision",
          storage_path: path,
          mime_type: input.asset.mimeType,
          width: input.asset.width ?? null,
          height: input.asset.height ?? null,
          size_bytes: input.asset.size ?? null,
          is_default: isFirst,
          status: "active",
          instructions: logo.instructions ?? null,
          created_by: getActiveUserId(),
        });
        if (error) {
          await removeObjects(supabase, [path]);
          throw error;
        }
        if (isFirst) {
          await supabase.from("brands").update({ default_logo_id: assetId }).eq("id", brandId);
        }
      },
      rollback: () =>
        this.cacheUpdate(brandId, (b) => ({
          ...b,
          logos: b.logos.filter((l) => l.id !== assetId),
          defaultLogoId: b.defaultLogoId === assetId ? b.logos[0]?.id : b.defaultLogoId,
        })),
      context: "upload logo",
      reconcile: true,
    });
    return logo;
  }

  updateLogo(brandId: ID, logoId: ID, patch: Partial<Pick<LogoAsset, "kind" | "instructions">>): void {
    const prev = this.getById(brandId);
    if (!prev) return;
    this.optimistic({
      apply: () =>
        this.cacheUpdate(brandId, (b) => ({
          ...b,
          logos: b.logos.map((l) => (l.id === logoId ? { ...l, ...patch, updatedAt: nowIso() } : l)),
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const { error } = await db()
          .from("brand_assets")
          .update({ asset_type: patch.kind, instructions: patch.instructions?.trim() || null })
          .eq("id", logoId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(brandId, prev),
      context: "update logo",
    });
  }

  replaceLogoAsset(brandId: ID, logoId: ID, asset: ImageAsset): void {
    const orgId = requireActiveOrgId();
    const prev = this.getById(brandId);
    if (!prev) return;
    const path = brandAssetPath(orgId, brandId, logoId, asset.mimeType);
    this.optimistic({
      apply: () =>
        this.cacheUpdate(brandId, (b) => ({
          ...b,
          logos: b.logos.map((l) => (l.id === logoId ? { ...l, asset: { ...asset, id: logoId }, updatedAt: nowIso() } : l)),
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const supabase = db();
        const { blob } = dataUrlToBlob(asset.url);
        await uploadObject(supabase, { path, body: blob, contentType: asset.mimeType, upsert: true });
        const { error } = await supabase
          .from("brand_assets")
          .update({
            storage_path: path,
            mime_type: asset.mimeType,
            width: asset.width ?? null,
            height: asset.height ?? null,
            size_bytes: asset.size ?? null,
            name: asset.name,
          })
          .eq("id", logoId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(brandId, prev),
      context: "replace logo",
      reconcile: true,
    });
  }

  setLogoStatus(brandId: ID, logoId: ID, status: LogoStatus): void {
    const prev = this.getById(brandId);
    if (!prev) return;
    this.optimistic({
      apply: () =>
        this.cacheUpdate(brandId, (b) => ({
          ...b,
          logos: b.logos.map((l) => (l.id === logoId ? { ...l, status, updatedAt: nowIso() } : l)),
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const { error } = await db().from("brand_assets").update({ status }).eq("id", logoId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(brandId, prev),
      context: "update logo status",
    });
  }

  setDefaultLogo(brandId: ID, logoId: ID): void {
    const prev = this.getById(brandId);
    if (!prev) return;
    this.optimistic({
      apply: () => this.cacheUpdate(brandId, (b) => ({ ...b, defaultLogoId: logoId, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("brands").update({ default_logo_id: logoId }).eq("id", brandId);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(brandId, prev),
      context: "set default logo",
    });
  }

  removeLogo(brandId: ID, logoId: ID): void {
    const prev = this.getById(brandId);
    if (!prev) return;
    const removed = prev.logos.find((l) => l.id === logoId);
    this.optimistic({
      apply: () =>
        this.cacheUpdate(brandId, (b) => {
          const logos = b.logos.filter((l) => l.id !== logoId);
          const defaultLogoId = b.defaultLogoId === logoId ? logos[0]?.id : b.defaultLogoId;
          return { ...b, logos, defaultLogoId, updatedAt: nowIso() };
        }),
      persist: async () => {
        const supabase = db();
        const { error } = await supabase.from("brand_assets").delete().eq("id", logoId);
        if (error) throw error;
        if (removed) await removeObjects(supabase, [brandAssetPath(requireActiveOrgId(), brandId, logoId, removed.asset.mimeType)]);
      },
      rollback: () => this.cacheReplace(brandId, prev),
      context: "remove logo",
    });
  }
}
