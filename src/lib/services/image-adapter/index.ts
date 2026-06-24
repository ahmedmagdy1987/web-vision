import { MockImageAdapter } from "./mock-adapter";
import { OpenAIImageAdapter } from "./openai-adapter";
import { getImageProvider, type ImageProvider } from "./provider-config";
import type { ImageGenerationAdapter } from "./types";

export type {
  ImageGenerationAdapter,
  ImageGenerationParams,
  ImageGenerationResponse,
  GeneratedImage,
  ImageReference,
} from "./types";
export { MockImageAdapter } from "./mock-adapter";
export { OpenAIImageAdapter } from "./openai-adapter";
export { getImageProvider, type ImageProvider } from "./provider-config";

/**
 * Single place that decides which provider is active, driven explicitly by
 * `IMAGE_GENERATION_PROVIDER` (mock | openai). Selection NEVER silently falls
 * back to mock — an unknown value throws, and choosing "openai" returns the
 * OpenAI adapter (whose server route then requires a configured key).
 */
export function getImageAdapter(provider: ImageProvider = getImageProvider()): ImageGenerationAdapter {
  return provider === "openai" ? new OpenAIImageAdapter() : new MockImageAdapter();
}
