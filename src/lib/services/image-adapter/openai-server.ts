import "server-only";

import sharp from "sharp";
import type { AspectRatio } from "@/lib/domain";
import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_OUTPUT_FORMAT,
  DEFAULT_OPENAI_QUALITY,
  OPENAI_INPUT_FIDELITY_METADATA,
  openAiSize,
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

export type ProviderErrorCode =
  | "OPENAI_MODEL_ACCESS_DENIED"
  | "OPENAI_BILLING_REQUIRED"
  | "OPENAI_INVALID_PARAMETER"
  | "OPENAI_INVALID_REQUEST"
  | "OPENAI_CONTENT_POLICY"
  | "OPENAI_TIMEOUT"
  | "PROVIDER_ERROR";

/** A provider failure carrying a specific safe code + message — NEVER the key or
 *  the raw provider response body. */
export class OpenAIProviderError extends Error {
  readonly providerCode: ProviderErrorCode;
  readonly safeMessage: string;
  constructor(providerCode: ProviderErrorCode, safeMessage: string) {
    super(safeMessage);
    this.name = "OpenAIProviderError";
    this.providerCode = providerCode;
    this.safeMessage = safeMessage;
  }
}

/**
 * Classify an OpenAI SDK error into a specific safe code using its
 * status/code/type — without leaking the raw response. Defaults to a generic
 * provider error. Used to produce actionable, non-sensitive UI messages.
 */
export function classifyProviderError(err: unknown): OpenAIProviderError {
  const e = err as { status?: number; code?: string; type?: string; param?: string; name?: string; message?: string };
  const status = e?.status;
  const code = (e?.code ?? "").toLowerCase();
  const type = (e?.type ?? "").toLowerCase();
  const msg = (e?.message ?? "").toLowerCase();

  if (e?.name === "AbortError" || status === 408 || status === 504 || /timed out|timeout/.test(msg)) {
    return new OpenAIProviderError("OPENAI_TIMEOUT", "The image provider timed out.");
  }
  if (status === 402 || code.includes("insufficient_quota") || /quota|billing|exceeded your current/.test(msg)) {
    return new OpenAIProviderError("OPENAI_BILLING_REQUIRED", "OpenAI image access or billing is not enabled for this API project.");
  }
  if (type.includes("content_policy") || code.includes("content_policy") || code.includes("moderation") || /content policy|safety system|moderation/.test(msg)) {
    return new OpenAIProviderError("OPENAI_CONTENT_POLICY", "The request was blocked by the image provider's content policy.");
  }
  if (status === 404 || code.includes("model_not_found") || /model.*(not found|does not exist|do not have access)/.test(msg)) {
    return new OpenAIProviderError("OPENAI_MODEL_ACCESS_DENIED", "OpenAI image model access is not enabled for this API project.");
  }
  if (status === 401 || status === 403) {
    return new OpenAIProviderError("OPENAI_MODEL_ACCESS_DENIED", "OpenAI image access or billing is not enabled for this API project.");
  }
  if (status === 429) {
    return new OpenAIProviderError("PROVIDER_ERROR", "The image provider is busy. Please try again shortly.");
  }
  if (typeof status === "number" && status >= 400 && status < 500 && e?.param) {
    return new OpenAIProviderError(
      "OPENAI_INVALID_PARAMETER",
      "The image request configuration needs to be corrected before generating again.",
    );
  }
  if (typeof status === "number" && status >= 400 && status < 500) {
    return new OpenAIProviderError("OPENAI_INVALID_REQUEST", "The image provider rejected the request parameters.");
  }
  return new OpenAIProviderError("PROVIDER_ERROR", "The image provider could not complete the request.");
}

/**
 * Extract ONLY safe diagnostic fields from a provider error for server-side
 * logging — never the key, headers, signed URLs, storage paths, raw request
 * payloads or input bytes.
 */
export function safeProviderDiag(err: unknown): {
  status?: number;
  code?: string;
  type?: string;
  param?: string;
  requestId?: string;
} {
  const e = err as {
    status?: number;
    code?: string;
    type?: string;
    param?: string;
    request_id?: string;
    requestID?: string;
    headers?: Record<string, string>;
  };
  return {
    status: e?.status,
    code: e?.code,
    type: e?.type,
    param: e?.param,
    requestId: e?.request_id ?? e?.requestID ?? e?.headers?.["x-request-id"],
  };
}

const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * Call GPT Image 2's edit endpoint with the EXACT requested size and only the
 * documented fields (no input_fidelity, no background). Bounded retries on
 * transient errors only; honors an abort signal + per-attempt timeout. Returns
 * the correctly-sized base64 image. Never logs or returns the API key.
 */
export async function generateImageWithOpenAI(
  client: OpenAIImagesClient,
  config: OpenAIServerConfig,
  input: OpenAIGenerateInput,
  opts: { signal?: AbortSignal; timeoutMs?: number; maxAttempts?: number } = {},
): Promise<OpenAIGenerateResult> {
  const ordered = orderReferences(input.references);
  const size = openAiSize(input.aspectRatio);
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
      // GPT Image 2 edit payload — minimal, documented fields ONLY. No
      // `input_fidelity` (invalid for gpt-image-2; it uses high fidelity
      // automatically) and no `background` (defaults to auto).
      const response = await client.images.edit(
        {
          model: config.model,
          image: ordered.map((r) => r.file),
          prompt: input.prompt,
          size: size.size,
          quality: config.quality,
          output_format: config.outputFormat,
          n: 1,
        },
        { signal: controller.signal },
      );
      const b64 = response.data?.[0]?.b64_json;
      if (!b64) throw new Error("OpenAI returned no image data.");
      return {
        base64: b64,
        mimeType,
        nativeWidth: size.width,
        nativeHeight: size.height,
        nativeSize: size.size,
        model: config.model,
        quality: config.quality,
        inputFidelity: OPENAI_INPUT_FIDELITY_METADATA,
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
  // Server-side dev diagnostics — SAFE fields only (never key/headers/raw body).
  console.warn("[openai] image edit failed", safeProviderDiag(lastError));
  throw classifyProviderError(lastError);
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
 * Normalize a CORRECTLY-SIZED GPT Image 2 result: decode + validate it, re-encode
 * to the configured format, and report its ACTUAL dimensions. It NEVER crops or
 * stretches — the provider already returned the exact requested size, so no
 * content is removed.
 */
export async function postProcessToFinal(
  imageBytes: Buffer,
  _aspectRatio: AspectRatio,
  outputFormat: OpenAIOutputFormat,
): Promise<PostProcessedImage> {
  const mimeType = mimeForFormat(outputFormat);

  // Decode + validate; re-encode to the configured format (no resize, no crop).
  let pipeline = sharp(imageBytes, { failOn: "none" });
  if (outputFormat === "png") pipeline = pipeline.png();
  else if (outputFormat === "jpeg") pipeline = pipeline.jpeg({ quality: 90 });
  else pipeline = pipeline.webp({ quality: 90 });

  const buffer = await pipeline.toBuffer();
  const meta = await sharp(buffer).metadata();
  const base64 = buffer.toString("base64");
  return {
    buffer,
    base64,
    dataUrl: `data:${mimeType};base64,${base64}`,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    mimeType,
  };
}
