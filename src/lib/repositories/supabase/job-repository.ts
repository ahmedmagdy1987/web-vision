import type { GenerationJob, ID, JobStatus } from "@/lib/domain";
import { nowIso } from "@/lib/ids";
import type { GenerationJobRow, JobStatusDb } from "@/lib/supabase/database.types";
import { SupabaseCollection } from "./collection";
import { db, getActiveOrgId, getActiveUserId, requireActiveOrgId } from "./context";
import { jobFromRow } from "./mappers";
import type { JobRepositoryApi } from "../types";

function toDbStatus(status: JobStatus): JobStatusDb {
  return status; // domain statuses are all valid db statuses
}

export class SupabaseJobRepository extends SupabaseCollection<GenerationJob> implements JobRepositoryApi {
  protected label() {
    return "jobs";
  }

  protected async fetchAll(): Promise<GenerationJob[]> {
    const orgId = getActiveOrgId();
    if (!orgId) return [];
    const supabase = db();
    const { data: jobs, error } = await supabase
      .from("generation_jobs")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    const rows = (jobs ?? []) as GenerationJobRow[];

    const resultIdsByJob = new Map<string, string[]>();
    if (rows.length) {
      const { data: results, error: rErr } = await supabase
        .from("generation_results")
        .select("id, job_id")
        .in("job_id", rows.map((j) => j.id));
      if (rErr) throw rErr;
      for (const r of results ?? []) {
        const list = resultIdsByJob.get(r.job_id) ?? [];
        list.push(r.id);
        resultIdsByJob.set(r.job_id, list);
      }
    }
    return rows.map((j) => jobFromRow(j, resultIdsByJob.get(j.id) ?? []));
  }

  createJob(job: GenerationJob): GenerationJob {
    const orgId = requireActiveOrgId();
    return this.optimistic({
      apply: () => {
        this.cachePrepend(job);
        return job;
      },
      persist: async () => {
        const supabase = db();
        const { request } = job;
        const { error } = await supabase.from("generation_jobs").insert({
          id: job.id,
          organization_id: orgId,
          brand_id: request.brandId || null,
          location_id: request.locationId ?? null,
          status: toDbStatus(job.status),
          progress: job.progress,
          request: JSON.parse(JSON.stringify(request)),
          instructions: JSON.parse(JSON.stringify(request.instructions)),
          provider: "mock",
          created_by: getActiveUserId(),
          started_at: job.status === "processing" ? nowIso() : null,
        });
        if (error) throw error;
        if (request.productIds.length) {
          const { error: jpErr } = await supabase
            .from("generation_job_products")
            .insert(request.productIds.map((pid) => ({ job_id: job.id, product_id: pid })));
          if (jpErr) throw jpErr;
        }
      },
      rollback: () => this.cacheRemove(job.id),
      context: "create job",
    });
  }

  setStatus(id: ID, status: JobStatus, patch: Partial<GenerationJob> = {}): GenerationJob | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    const isTerminal = status === "completed" || status === "failed";
    return this.optimistic({
      apply: () =>
        this.cacheUpdate(id, (j) => ({
          ...j,
          ...patch,
          status,
          updatedAt: nowIso(),
          completedAt: isTerminal ? nowIso() : j.completedAt,
        })),
      persist: async () => {
        const { error } = await db()
          .from("generation_jobs")
          .update({
            status: toDbStatus(status),
            ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
            ...(patch.error !== undefined ? { error_message: patch.error } : {}),
            ...(status === "processing" ? { started_at: nowIso() } : {}),
            ...(isTerminal ? { completed_at: nowIso() } : {}),
          })
          .eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update job status",
    });
  }

  setProgress(id: ID, progress: number): GenerationJob | undefined {
    const prev = this.getById(id);
    if (!prev) return undefined;
    return this.optimistic({
      apply: () => this.cacheUpdate(id, (j) => ({ ...j, progress, updatedAt: nowIso() })),
      persist: async () => {
        const { error } = await db().from("generation_jobs").update({ progress }).eq("id", id);
        if (error) throw error;
      },
      rollback: () => this.cacheReplace(id, prev),
      context: "update job progress",
    });
  }

  attachResults(id: ID, resultIds: ID[]): GenerationJob | undefined {
    // resultIds are derived from the generation_results table on reload; here we
    // only reflect them optimistically in the cache.
    return this.cacheUpdate(id, (j) => ({ ...j, resultIds, updatedAt: nowIso() }));
  }

  fail(id: ID, error: string): GenerationJob | undefined {
    return this.setStatus(id, "failed", { error });
  }
}
