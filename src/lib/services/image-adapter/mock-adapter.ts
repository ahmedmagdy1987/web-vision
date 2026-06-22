import { dimensionsForAspect } from "@/lib/domain";
import { scenePlaceholderDataUrl } from "@/lib/placeholders";
import type {
  GeneratedImage,
  ImageGenerationAdapter,
  ImageGenerationParams,
  ImageGenerationResponse,
} from "./types";

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

export interface MockAdapterConfig {
  /** Approximate total processing time in ms. */
  durationMs?: number;
  /** Probability (0–1) the generation fails, to exercise the failed state. */
  failureRate?: number;
}

/**
 * Local mock implementation of {@link ImageGenerationAdapter}. It simulates
 * latency and progress, then renders deterministic SVG placeholder images so
 * the full pipeline (queued → processing → completed/failed) can be exercised
 * with no external API.
 */
export class MockImageAdapter implements ImageGenerationAdapter {
  readonly name = "mock";
  private readonly durationMs: number;
  private readonly failureRate: number;

  constructor(config: MockAdapterConfig = {}) {
    this.durationMs = config.durationMs ?? 2000;
    this.failureRate = config.failureRate ?? 0;
  }

  async generate(
    params: ImageGenerationParams,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<ImageGenerationResponse> {
    const steps = 9;
    const stepMs = this.durationMs / steps;
    for (let i = 1; i <= steps; i++) {
      await delay(stepMs, signal);
      onProgress?.(Math.round((i / steps) * 100));
    }

    // Deterministic failure trigger: include "#fail" anywhere in the brief
    // (e.g. in Studio notes) to reliably exercise the failed state in a demo,
    // in addition to the optional random failureRate.
    const forceFail = /#fail\b/i.test(params.prompt);
    if (forceFail || (this.failureRate > 0 && Math.random() < this.failureRate)) {
      throw new Error("The generation provider failed to process this request. Please try again.");
    }

    const { width, height } = dimensionsForAspect(params.aspectRatio);
    const seedBase = params.seedHint ?? Math.floor(Math.random() * 100000);
    const images: GeneratedImage[] = Array.from({ length: params.count }, (_, i) => {
      const seed = seedBase + i * 17;
      return {
        url: scenePlaceholderDataUrl({
          label: params.label,
          sublabel: params.sublabel ? `${params.sublabel} · v${i + 1}` : `Variation ${i + 1}`,
          accent: params.brandAccent,
          width,
          height,
          seed,
        }),
        width,
        height,
        seed,
        mimeType: "image/svg+xml",
      };
    });

    return { images, provider: this.name };
  }
}
