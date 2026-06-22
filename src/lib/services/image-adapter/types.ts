import type { AspectRatio } from "@/lib/domain";

/** Parameters passed to any image-generation provider. */
export interface ImageGenerationParams {
  /** Composed instruction / prompt text. */
  prompt: string;
  aspectRatio: AspectRatio;
  /** Number of images to produce. */
  count: number;
  /** Accent color used by the mock renderer (and as future style hint). */
  brandAccent: string;
  /** Optional caption hints used by the mock renderer. */
  label?: string;
  sublabel?: string;
  /** Optional deterministic seed base. */
  seedHint?: number;
}

export interface GeneratedImage {
  url: string;
  width: number;
  height: number;
  seed: number;
  mimeType: string;
}

export interface ImageGenerationResponse {
  images: GeneratedImage[];
  provider: string;
}

/**
 * Provider-agnostic image generation interface. A real provider (e.g. a hosted
 * image API) can implement this without any changes to callers — only
 * `getImageAdapter()` needs to return the new implementation.
 */
export interface ImageGenerationAdapter {
  readonly name: string;
  generate(
    params: ImageGenerationParams,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<ImageGenerationResponse>;
}
