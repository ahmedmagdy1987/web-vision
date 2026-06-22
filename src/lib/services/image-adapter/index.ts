import { MockImageAdapter } from "./mock-adapter";
import type { ImageGenerationAdapter } from "./types";

export type {
  ImageGenerationAdapter,
  ImageGenerationParams,
  ImageGenerationResponse,
  GeneratedImage,
} from "./types";
export { MockImageAdapter } from "./mock-adapter";

/**
 * Single place that decides which provider is active. Swap the returned
 * implementation here when a real image API is introduced — callers depend only
 * on the {@link ImageGenerationAdapter} interface.
 */
const adapter: ImageGenerationAdapter = new MockImageAdapter();

export function getImageAdapter(): ImageGenerationAdapter {
  return adapter;
}
