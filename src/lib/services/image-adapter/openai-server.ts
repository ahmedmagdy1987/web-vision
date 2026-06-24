import "server-only";

import sharp from "sharp";
import type { AspectRatio } from "@/lib/domain";
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_OUTPUT_FORMAT,
  DEFAULT_OPENAI_QUALITY,
  finalSize,
  OPENAI_INPUT_FIDELITY,
  openAiNativeSize,
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
 * missing — the caller must NOT silently fall back to mock when configured for
 * OpenAI.
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

/** The provider-native result (before post-processing to the final ratio). */
export interface OpenAIGenerateResult {
  base64: string;
  mimeType: string;
  nativeWidth: number;
  nativeHeight: number;
  nativeSize: string;
  model: string;
  quality: string;
  inputFidelity: string;
  requestId?: string;
  usage?: unknown;
}

/** Minimal client surface so this is unit-testable with a fake (the real impl is
 *  the official `openai` SDK's `client.images.edit`). */
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
 * Order references deterministically — location (BASE scene) → products → logo —
 * and validate that the required images are present.
 */
export function orderReferences(references: OpenAIReferenceImage[]): OpenAIReferenceImage[] {
  const location = references.filter((r) => r.role === "location");
  if (location.length === 0) throw new Error("A base location image is required before generating.");
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

/** Retry only explicitly transient failures — never 4xx (content-policy /
 *  invalid-request). 429 + 5xx + status-less network errors are transient. */
export function isRetryableProviderError(err: unknown): boolean {
  if ((err as { name?: string })?.name === "AbortError") return false;
  const status = (err as { status?: number })?.status;
  if (typeof status === "number") return status === 429 || status >= 500;
  return true;
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Call GPT Image 2's edit endpoint with `input_fidelity: high` and a VALID native
 * size. Bounded retries on transient errors only; honors an abort signal +
 * per-attempt timeout. Returns the native base64 image (post-process separately
 * to the final ratio). Never logs or returns the API key.
 */
export async function generateImageWithOpenAI(
  client: OpenAIImagesClient,
  config: OpenAIServerConfig,
  input: OpenAIGenerateInput,
  opts: { signal?: AbortSignal; timeoutMs?: number; maxAttempts?: number } = {},
): Promise<OpenAIGenerateResult> {
  const ordered = orderReferences(input.references);
  const native = openAiNativeSize(input.aspectRatio);
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
          size: native.size,
          quality: config.quality,
          output_format: config.outputFormat,
          input_fidelity: OPENAI_INPUT_FIDELITY,
          n: 1,
          background: "auto",
        },
        { signal: controller.signal },
      );
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI returned no image data.");
      return {
        base64: b64,
        mimeType,
        nativeWidth: native.width,
        nativeHeight: native.height,
        nativeSize: native.size,
        model: config.model,
        quality: config.quality,
        inputFidelity: OPENAI_INPUT_FIDELITY,
        requestId: response._request_id ?? undefined,
        usage: response.usage,
      };
    } catch (err) {
      lastError = err;
      if ((err as { name?: string })?.name === "AbortError" && opts.signal?.aborted) throw err;
      if (attempt >= maxAttempts || !isRetryableProviderError(err)) break;
      await new Promise((r) => setTimeout(r, 300 * attempt));
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onAbort);
    }
  }
  throw new Error(`OpenAI image generation failed: ${(lastError as Error)?.message ?? "unknown error"}`);
}

export interface PostProcessedImage {
  buffer: Buffer;
  base64: string;
  dataUrl: string;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Post-process the native provider image to the application's EXACT final size
 * via a deterministic centered crop (sharp) — never an upscale or a stretch.
 * Preserves quality (crop, then re-encode in the output format).
 */
export async function postProcessToFinal(
  imageBytes: Buffer,
  aspectRatio: AspectRatio,
  outputFormat: OpenAIOutputFormat,
): Promise<PostProcessedImage> {
  const final = finalSize(aspectRatio);
  const mimeType = mimeForFormat(outputFormat);

  const meta = await sharp(imageBytes, { failOn: "none" }).metadata();
  const w = meta.width ?? final.width;
  const h = meta.height ?? final.height;

  let pipeline = sharp(imageBytes, { failOn: "none" });
  if (w >= final.width && h >= final.height) {
    // Deterministic centered crop — no scaling at all.
    pipeline = pipeline.extract({
      left: Math.floor((w - final.width) / 2),
      top: Math.floor((h - final.height) / 2),
      width: final.width,
      height: final.height,
    });
  } else {
    // Native unexpectedly smaller than final → cover-fit (last resort).
    pipeline = pipeline.resize(final.width, final.height, { fit: "cover", position: "centre" });
  }

  if (outputFormat === "png") pipeline = pipeline.png();
  else if (outputFormat === "jpeg") pipeline = pipeline.jpeg({ quality: 90 });
  else pipeline = pipeline.webp({ quality: 90 });

  const buffer = await pipeline.toBuffer();
  const base64 = buffer.toString("base64");
  return { buffer, base64, dataUrl: `data:${mimeType};base64,${base64}`, width: final.width, height: final.height, mimeType };
}
