import type {
  ImageGenerationAdapter,
  ImageGenerationParams,
  ImageGenerationResponse,
} from "./types";
import { getReferenceLimit } from "./provider-config";

/**
 * Client-side OpenAI adapter. It NEVER holds the API key — it posts the prompt
 * and reference image URLs to the server-only `/api/generate-image` route, which
 * performs the GPT Image 2 edit call and returns a base64 data URL that flows
 * through the existing Storage-upload persistence unchanged.
 */
export class OpenAIImageAdapter implements ImageGenerationAdapter {
  readonly name = "openai";

  async generate(
    params: ImageGenerationParams,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal,
  ): Promise<ImageGenerationResponse> {
    const references = (params.referenceImages ?? []).slice(0, getReferenceLimit());
    if (references.length === 0) {
      throw new Error("OpenAI generation requires reference images (location, products and logo).");
    }

    onProgress?.(8);
    const res = await fetch("/api/generate-image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        prompt: params.prompt,
        aspectRatio: params.aspectRatio,
        references: references.map((r) => ({
          role: r.role,
          url: r.url,
          mimeType: r.mimeType,
          name: r.name,
        })),
      }),
      signal,
    });
    onProgress?.(85);

    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(data.error || `Image generation failed (${res.status}).`);
    }

    const data = (await res.json()) as {
      dataUrl: string;
      width: number;
      height: number;
      mimeType: string;
    };
    onProgress?.(100);

    return {
      images: [
        {
          url: data.dataUrl,
          width: data.width,
          height: data.height,
          seed: params.seedHint ?? 0,
          mimeType: data.mimeType,
        },
      ],
      provider: this.name,
    };
  }
}
