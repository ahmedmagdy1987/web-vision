import { MockImageAdapter } from "./mock-adapter";
import type { ImageGenerationAdapter } from "./types";

export type {
  ImageGenerationAdapter,
  ImageGenerationParams,
  ImageGenerationResponse,
  GeneratedImage,
  ImageReference,
} from "./types";
export { MockImageAdapter } from "./mock-adapter";
export { getImageProvider, type ImageProvider } from "./provider-config";

/**
 * The in-browser generation flow always uses the mock adapter. The real OpenAI
 * generation runs ENTIRELY server-side via `/api/generate-image`, selected by the
 * server-authoritative `IMAGE_GENERATION_PROVIDER` — the browser never selects or
 * runs the OpenAI provider, and never holds the API key. Provider selection lives
 * in `getImageProvider()` (server) + the route, never here.
 */
export function getImageAdapter(): ImageGenerationAdapter {
  return new MockImageAdapter();
}
