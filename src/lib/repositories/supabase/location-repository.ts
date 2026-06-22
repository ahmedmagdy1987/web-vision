import type { ID, Location } from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { locationAssetPath } from "@/lib/storage/paths";
import { createSignedUrls, dataUrlToBlob, removeObjects, uploadObject } from "@/lib/storage/storage-service";
import type { LocationAssetRow, LocationRow } from "@/lib/supabase/database.types";
import { SupabaseCollection } from "./collection";
import { db, getActiveUserId, requireActiveOrgId } from "./context";
import { locationFromRow, type SignUrl } from "./mappers";
import type { LocationInput, LocationRepositoryApi } from "../types";

export class SupabaseLocationRepository extends SupabaseCollection<Location> implements LocationRepositoryApi {
  protected label() {
    return "locations";
  }

  protected async fetchAll(): Promise<Location[]> {
    const orgId = requireActiveOrgId();
    const supabase = db();
    const { data: locations, error } = await supabase
      .from("locations")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: true });
    if (error) throw error;
    const rows = (locations ?? []) as LocationRow[];

    let assets: LocationAssetRow[] = [];
    if (rows.length) {
      const { data, error: assetErr } = await supabase
        .from("location_assets")
        .select("*")
        .in("location_id", rows.map((l) => l.id));
      if (assetErr) throw assetErr;
      assets = (data ?? []) as LocationAssetRow[];
    }
    const signed = await createSignedUrls(supabase, assets.map((a) => a.storage_path));
    const sign: SignUrl = (p) => signed.get(p) ?? "";
    return rows.map((l) => locationFromRow(l, assets.filter((a) => a.location_id === l.id), sign));
  }

  addLocation(input: LocationInput): Location {
    const orgId = requireActiveOrgId();
    const id = newId();
    const ts = nowIso();
    const location: Location = {
      id,
      name: input.name.trim(),
      brandId: input.brandId,
      usage: input.usage,
      images: input.images,
      mainImageId: input.mainImageId ?? input.images[0]?.id,
      description: input.description?.trim() || undefined,
      preservationInstructions: input.preservationInstructions?.trim() || undefined,
      saved: input.saved ?? true,
      createdAt: ts,
      updatedAt: ts,
    };
    return this.optimistic({
      apply: () => {
        this.cacheAppend(location);
        return location;
      },
      persist: async () => {
        const supabase = db();
        const { error } = await supabase.from("locations").insert({
          id,
          organization_id: orgId,
          brand_id: input.brandId ?? null,
          name: location.name,
          description: location.description ?? null,
          environment_type: input.usage,
          preservation_instructions: location.preservationInstructions ?? null,
          status: "active",
          created_by: getActiveUserId(),
        });
        if (error) throw error;

        const mainOriginalId = input.mainImageId ?? input.images[0]?.id;
        const prepared = input.images.map((img, i) => {
          const assetId = newId();
          return {
            assetId,
            isPrimary: img.id === mainOriginalId,
            sort: i,
            path: locationAssetPath(orgId, id, assetId, img.mimeType),
            blob: dataUrlToBlob(img.url).blob,
            img,
          };
        });
        const uploaded: string[] = [];
        try {
          for (const p of prepared) {
            await uploadObject(supabase, { path: p.path, body: p.blob, contentType: p.img.mimeType });
            uploaded.push(p.path);
          }
          if (prepared.length) {
            const { error: assetErr } = await supabase.from("location_assets").insert(
              prepared.map((p) => ({
                id: p.assetId,
                location_id: id,
                storage_bucket: "web-vision",
                storage_path: p.path,
                mime_type: p.img.mimeType,
                width: p.img.width ?? null,
                height: p.img.height ?? null,
                size_bytes: p.img.size ?? null,
                sort_order: p.sort,
                is_primary: p.isPrimary,
                created_by: getActiveUserId(),
              })),
            );
            if (assetErr) throw assetErr;
            const main = prepared.find((p) => p.isPrimary) ?? prepared[0];
            if (main) await supabase.from("locations").update({ main_image_id: main.assetId }).eq("id", id);
          }
        } catch (assetError) {
          if (uploaded.length) await removeObjects(supabase, uploaded);
          throw assetError;
        }
      },
      rollback: () => this.cacheRemove(id),
      context: "create location",
      reconcile: true,
    });
  }

  updateLocation(id: ID, input: Partial<LocationInput>): Location | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () =>
        this.cacheUpdate(id, (l) => ({
          ...l,
          ...input,
          name: input.name?.trim() ?? l.name,
          updatedAt: nowIso(),
        })),
      persist: async () => {
        const { error } = await db()
          .from("locations")
          .update({
            name: input.name?.trim(),
            brand_id: input.brandId ?? null,
            environment_type: input.usage,
            description: input.description?.trim() || null,
            preservation_instructions: input.preservationInstructions?.trim() || null,
          })
          .eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update location",
    });
  }

  setMainImage(id: ID, imageId: ID): Location | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (l) => ({ ...l, mainImageId: imageId, updatedAt: nowIso() })),
      persist: async () => {
        const supabase = db();
        const { error } = await supabase.from("locations").update({ main_image_id: imageId }).eq("id", id);
        if (error) throw error;
        await supabase.from("location_assets").update({ is_primary: false }).eq("location_id", id);
        await supabase.from("location_assets").update({ is_primary: true }).eq("id", imageId);
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "set main image",
    });
  }
}
