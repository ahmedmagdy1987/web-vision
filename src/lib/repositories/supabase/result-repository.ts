import type { GenerationResult, ID, ResultReview } from "@/lib/domain";
import { nowIso } from "@/lib/ids";
import { resultPath } from "@/lib/storage/paths";
import { createSignedUrls, dataUrlToBlob, removeObjects, uploadObject } from "@/lib/storage/storage-service";
import type { GenerationResultRow } from "@/lib/supabase/database.types";
import { SupabaseCollection } from "./collection";
import { db, getActiveOrgId, requireActiveOrgId } from "./context";
import { resultFromRow, type SignUrl } from "./mappers";
import type { ResultRepositoryApi } from "../types";

export class SupabaseResultRepository extends SupabaseCollection<GenerationResult> implements ResultRepositoryApi {
  protected label() {
    return "results";
  }

  protected async fetchAll(): Promise<GenerationResult[]> {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const supabase = db();
    const { data, error } = await supabase
      .from("generation_results")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (data ?? []) as GenerationResultRow[];
    const signed = await createSignedUrls(supabase, rows.map((r) => r.storage_path));
    const sign: SignUrl = (p) => signed.get(p) ?? "";
    return rows.map((r) => resultFromRow(r, sign));
  }

  addResult(result: GenerationResult): GenerationResult {
    const orgId = requireActiveOrgId();
    const path = resultPath(orgId, result.jobId, result.id, result.image.mimeType);
    return this.optimistic({
      apply: () => {
        this.cachePrepend(result);
        return result;
      },
      persist: async () => {
        const supabase = db();
        const { blob } = dataUrlToBlob(result.image.url);
        await uploadObject(supabase, { path, body: blob, contentType: result.image.mimeType });
        const { error } = await supabase.from("generation_results").insert({
          id: result.id,
          job_id: result.jobId,
          organization_id: orgId,
          storage_bucket: "web-vision",
          storage_path: path,
          mime_type: result.image.mimeType,
          width: result.image.width ?? null,
          height: result.image.height ?? null,
          aspect_ratio: result.snapshot.settings.aspectRatio,
          seed: result.seed,
          result_index: result.index,
          review_status: result.review,
          is_favorite: result.favorite,
          snapshot: JSON.parse(JSON.stringify(result.snapshot)),
          provider_metadata: { requestId: result.requestId, provider: "mock" },
        });
        if (error) {
          await removeObjects(supabase, [path]);
          throw error;
        }
      },
      rollback: () => this.cacheRemove(result.id),
      context: "save result",
    });
  }

  byJob(jobId: ID): GenerationResult[] {
    return this.list().filter((r) => r.jobId === jobId);
  }

  setReview(id: ID, review: ResultReview): GenerationResult | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (r) => ({ ...r, review, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("generation_results").update({ review_status: review }).eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update review",
    });
  }

  setFavorite(id: ID, favorite: boolean): GenerationResult | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (r) => ({ ...r, favorite, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("generation_results").update({ is_favorite: favorite }).eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update favorite",
    });
  }

  toggleFavorite(id: ID): GenerationResult | undefined {
    const current = this.getById(id);
    if (!current) return undefined;
    return this.setFavorite(id, !current.favorite);
  }
}
