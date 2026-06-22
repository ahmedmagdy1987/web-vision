import type { GenerationResult, ID, ResultReview } from "@/lib/domain";
import { nowIso } from "@/lib/ids";
import { buildSeed } from "@/lib/seed/seed-data";
import { ObservableCollection } from "./observable-store";
import type { ResultRepositoryApi } from "./types";

export class ResultRepository extends ObservableCollection<GenerationResult> implements ResultRepositoryApi {
  constructor() {
    super("results", () => buildSeed().results);
  }

  addResult(result: GenerationResult): GenerationResult {
    return this.prepend(result);
  }

  byJob(jobId: ID): GenerationResult[] {
    return this.list().filter((r) => r.jobId === jobId);
  }

  setReview(id: ID, review: ResultReview): GenerationResult | undefined {
    return this.update(id, (r) => ({ ...r, review, updatedAt: nowIso() }));
  }

  setFavorite(id: ID, favorite: boolean): GenerationResult | undefined {
    return this.update(id, (r) => ({ ...r, favorite, updatedAt: nowIso() }));
  }

  toggleFavorite(id: ID): GenerationResult | undefined {
    return this.update(id, (r) => ({ ...r, favorite: !r.favorite, updatedAt: nowIso() }));
  }
}

export const resultRepository = new ResultRepository();
