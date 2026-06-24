import "server-only";

import type { AspectRatio } from "@/lib/domain";
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_OUTPUT_FORMAT,
  DEFAULT_OPENAI_QUALITY,
  openAiSizeForAspect,
} from "./provider-config";

export type OpenAIQuality = "low" | "medium" | "high" | "auto";
export type OpenAIOutputFormat = "webp" | "png" | "jpeg";

export interface OpenAIServerConfig {
  apiKey: string;
  model: string;
  quality: OpenAIQuality;
  outputFormat: OpenAIOutputFormat;
}

const QUALITIES: OpenAIQuality[] = ["low", "medium", "high", "auto"];
const FORMATS: OpenAIOutputFormat[] = ["webp", "png", "jpeg"];

/**
 * Read + validate the server-only OpenAI configuration. Throws if the key is
 * missing — the caller must NOT silently fall back to mock when the provider is
 * configured for OpenAI.
 */
export function requireOpenAIConfig(): OpenAIServerConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "OPENAI_API_KEY is not configured. Add it to .env.local and the Vercel project before using the OpenAI provider.",
    );
  }
  const quality = (process.env.OPENAI_IMAGE_QUALITY?.trim().toLowerCase() as OpenAIQuality) || DEFAULT_OPENAI_QUALITY;
  const outputFormat =
    (process.env.OPENAI_IMAGE_OUTPUT_FORMAT?.trim().toLowerCase() as OpenAIOutputFormat) || DEFAULT_OPENAI_OUTPUT_FORMAT;
  return {
    apiKey,
    model: process.env.OPENAI_IMAGE_MODEL?.trim() || DEFAULT_OPENAI_MODEL,
    quality: QUALITIES.includes(quality) ? quality : "medium",
    outputFormat: FORMATS.includes(outputFormat) ? outputFormat : "webp",
  };
}

export type ReferenceRole = "location" | "product" | "logo";

export interface OpenAIReferenceImage {
  role: ReferenceRole;
  /** Upload-ready image (the SDK's toFile result). Loosely typed to avoid SDK coupling here. */
  file: unknown;
  name: string;
  mimeType: string;
}

export interface OpenAIGenerateInput {
  prompt: string;
  aspectRatio: AspectRatio;
  references: OpenAIReferenceImage[];
}

export interface OpenAIGenerateResult {
  base64: string;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  model: string;
  quality: string;
  size: string;
  requestId?: string;
  usage?: unknown;
}

/** Minimal client surface so this is unit-testable with a fake. The real
 *  implementation is the official `openai` SDK (`client.images.edit`). */
export interface OpenAIImagesClient {
  images: {
    edit(
      body: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ): Promise<{
      data?: Array<{ b64_json?: string | null }> | null;
      usage?: unknown;
      _request_id?: string | null;
    }>;
  };
}

/**
 * Order references deterministically — the location is the BASE scene, then each
 * product, then the logo — and validate that the required images are present.
 */
export function orderReferences(references: OpenAIReferenceImage[]): OpenAIReferenceImage[] {
  const location = references.filter((r) => r.role === "location");
  if (location.length === 0) {
    throw new Error("A base location image is required before generating.");
  }
  const products = references.filter((r) => r.role === "product");
  const logo = references.filter((r) => r.role === "logo");
  if (products.length === 0 && logo.length === 0) {
    throw new Error("At least one product image or a logo image is required.");
  }
  return [...location, ...products, ...logo];
}

function mimeForFormat(format: OpenAIOutputFormat): string {
  return format === "png" ? "image/png" : format === "jpeg" ? "image/jpeg" : "image/webp";
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Call GPT Image 2's edit endpoint (the request contains existing images, so the
 * edit flow is used). Bounded retries on transient errors; honors an abort
 * signal + per-attempt timeout. Returns a base64 data URL ready for the existing
 * Storage upload path. Never logs or returns the API key.
 */
export async function generateImageWithOpenAI(
  client: OpenAIImagesClient,
  config: OpenAIServerConfig,
  input: OpenAIGenerateInput,
  opts: { signal?: AbortSignal; timeoutMs?: number; maxAttempts?: number } = {},
): Promise<OpenAIGenerateResult> {
  const ordered = orderReferences(input.references);
  const { width, height, size } = openAiSizeForAspect(input.aspectRatio);
  const mimeType = mimeForFormat(config.outputFormat);
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 2);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const controller = new AbortController();
    const onAbort = () => controller.abort();
    opts.signal?.addEventListener("abort", onAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await client.images.edit(
        {
          model: config.model,
          image: ordered.map((r) => r.file),
          prompt: input.prompt,
          size,
          quality: config.quality,
          output_format: config.outputFormat,
          n: 1,
          background: "auto",
        },
        { signal: controller.signal },
      );
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI returned no image data.");
      return {
        base64: b64,
        dataUrl: `data:${mimeType};base64,${b64}`,
        mimeType,
        width,
        height,
        model: config.model,
        quality: config.quality,
        size,
        requestId: response._request_id ?? undefined,
        usage: response.usage,
      };
    } catch (err) {
      lastError = err;
      if ((err as { name?: string })?.name === "AbortError" && opts.signal?.aborted) throw err;
      if (attempt >= maxAttempts) break;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    }
  }
  throw new Error(`OpenAI image generation failed: ${(lastError as Error)?.message ?? "unknown error"}`);
}
