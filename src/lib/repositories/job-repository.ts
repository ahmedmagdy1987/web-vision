import type { GenerationJob, ID, JobStatus } from "@/lib/domain";
import { nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";

export class JobRepository extends ObservableCollection<GenerationJob> {
  constructor() {
    super("jobs", () => buildSeed().jobs);
  }

  createJob(job: GenerationJob): GenerationJob {
    return this.prepend(job);
  }

  setStatus(id: ID, status: JobStatus, patch: Partial<GenerationJob> = {}): GenerationJob | undefined {
    return this.update(id, (j) => ({
      ...j,
      ...patch,
      status,
      updatedAt: nowIso(),
      completedAt: status === "completed" || status === "failed" ? nowIso() : j.completedAt,
    }));
  }

  setProgress(id: ID, progress: number): GenerationJob | undefined {
    return this.update(id, (j) => ({ ...j, progress, updatedAt: nowIso() }));
  }

  attachResults(id: ID, resultIds: ID[]): GenerationJob | undefined {
    return this.update(id, (j) => ({ ...j, resultIds, updatedAt: nowIso() }));
  }

  fail(id: ID, error: string): GenerationJob | undefined {
    return this.setStatus(id, "failed", { error });
  }
}

export const jobRepository = new JobRepository();
