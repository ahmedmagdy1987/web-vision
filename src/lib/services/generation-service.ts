import type {
  GenerationJob,
  GenerationRequest,
  GenerationResult,
  ImageAsset,
  ResultSnapshot,
} from "@/lib/domain";
import { newId, nowIso } from "@/lib/ids";
import { jobRepository } from "@/lib/repositories/job-repository";
import { resultRepository } from "@/lib/repositories/result-repository";
import { getImageAdapter } from "./image-adapter";
import { GenerationValidationError, validateGenerationRequest } from "./validation";

export interface StartGenerationInput {
  request: GenerationRequest;
  /** Denormalized display data stored on each result. */
  snapshot: ResultSnapshot;
  /** Called on every job state transition for live UI updates. */
  onUpdate?: (job: GenerationJob) => void;
  signal?: AbortSignal;
}

function toImageAsset(url: string, name: string, width: number, height: number): ImageAsset {
  return {
    id: newId("img"),
    url,
    name,
    mimeType: "image/svg+xml",
    size: url.length,
    width,
    height,
    createdAt: nowIso(),
  };
}

/**
 * Orchestrates a mock generation: validates, creates a job, drives it through
 * queued → processing → completed/failed, persists the job and its results via
 * the repository layer, and reports progress through `onUpdate`.
 */
export async function startGeneration(input: StartGenerationInput): Promise<GenerationJob> {
  const { request, snapshot, onUpdate, signal } = input;

  const issues = validateGenerationRequest(request);
  if (issues.length > 0) {
    throw new GenerationValidationError(issues);
  }

  const ts = nowIso();
  const queued: GenerationJob = {
    id: newId(),
    request,
    status: "queued",
    progress: 0,
    resultIds: [],
    createdAt: ts,
    updatedAt: ts,
  };
  jobRepository.createJob(queued);
  onUpdate?.(queued);

  const processing = jobRepository.setStatus(queued.id, "processing", { progress: 0 });
  if (processing) onUpdate?.(processing);

  try {
    const adapter = getImageAdapter();
    const response = await adapter.generate(
      {
        prompt: request.instructions.text,
        aspectRatio: request.settings.aspectRatio,
        count: request.settings.outputCount,
        brandAccent: snapshot.brandAccent,
        label: snapshot.brandName,
        sublabel: snapshot.locationName,
      },
      (progress) => {
        const updated = jobRepository.setProgress(queued.id, progress);
        if (updated) onUpdate?.(updated);
      },
      signal,
    );

    const results: GenerationResult[] = response.images.map((image, index) => {
      const resultId = newId();
      return {
        id: resultId,
        jobId: queued.id,
        requestId: request.id,
        projectId: request.projectId,
        image: toImageAsset(image.url, `${snapshot.brandName} mockup ${index + 1}`, image.width, image.height),
        index,
        seed: image.seed,
        review: "draft",
        favorite: false,
        snapshot,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
    });

    results.forEach((result) => resultRepository.addResult(result));
    const resultIds = results.map((r) => r.id);
    const completed = jobRepository.setStatus(queued.id, "completed", { progress: 100, resultIds });
    if (completed) onUpdate?.(completed);
    return completed ?? queued;
  } catch (error) {
    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "Generation was cancelled."
        : error instanceof Error
          ? error.message
          : "Generation failed.";
    const failed = jobRepository.fail(queued.id, message);
    if (failed) onUpdate?.(failed);
    return failed ?? queued;
  }
}
