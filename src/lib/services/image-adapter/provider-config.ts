import type { AspectRatio } from "@/lib/domain";

/**
 * Image-generation provider selection + GPT Image 2 size mapping. Contains NO
 * secrets. Provider selection is SERVER-AUTHORITATIVE: it reads only the
 * server-side `IMAGE_GENERATION_PROVIDER` — never a browser-supplied or
 * `NEXT_PUBLIC_` value. (On the client this resolves to "mock" because the var is
 * undefined there; the real OpenAI path runs entirely server-side.)
 */

export type ImageProvider = "mock" | "openai";

/**
 * Resolve the configured provider. EXPLICIT — never silently falls back to mock:
 * an unknown value throws. Defaults to "mock" when unset.
 */
export function getImageProvider(): ImageProvider {
  return parseImageProvider(process.env.IMAGE_GENERATION_PROVIDER ?? "mock");
}

export function parseImageProvider(raw: string): ImageProvider {
  const value = raw.trim().toLowerCase();
  if (value === "mock" || value === "openai") return value;
  throw new Error(`Invalid IMAGE_GENERATION_PROVIDER "${raw}" — expected "mock" or "openai".`);
}

/**
 * Exact output sizes sent to GPT Image 2 per aspect ratio. GPT Image 2 supports
 * flexible sizes whose edges are multiples of 16 and that meet its pixel/aspect
 * constraints, so these are the DIRECT provider sizes — we never request a larger
 * size and center-crop afterwards (which could drop important products/scene).
 */
export const OPENAI_SIZES: Record<AspectRatio, { width: number; height: number; size: string }> = {
  "1:1": { width: 1024, height: 1024, size: "1024x1024" },
  "4:5": { width: 1024, height: 1280, size: "1024x1280" },
  "16:9": { width: 1536, height: 864, size: "1536x864" },
  "9:16": { width: 864, height: 1536, size: "864x1536" },
  // Secondary ratios (not in the primary workflow) — also multiples of 16.
  "4:3": { width: 1024, height: 768, size: "1024x768" },
  "3:2": { width: 1536, height: 1024, size: "1536x1024" },
  "2:3": { width: 1024, height: 1536, size: "1024x1536" },
};

export function openAiSize(ratio: AspectRatio): { width: number; height: number; size: string } {
  return OPENAI_SIZES[ratio] ?? OPENAI_SIZES["1:1"];
}

/** Every size string we ever send to OpenAI (used by verification tests). */
export const OPENAI_SIZE_VALUES = Object.values(OPENAI_SIZES).map((s) => s.size);

/**
 * Maximum number of selected PRODUCTS sent as inputs, to bound cost / request
 * size / prompt clarity / composition reliability. Conservative + configurable.
 */
export function getMaxInputProducts(): number {
  const raw = process.env.OPENAI_MAX_INPUT_PRODUCTS;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 3;
}

/** Overall cap on input reference images (location + products + logo). */
export function getReferenceLimit(): number {
  const raw = process.env.OPENAI_IMAGE_REFERENCE_LIMIT;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

export const DEFAULT_OPENAI_MODEL = "gpt-image-2";
export const DEFAULT_OPENAI_QUALITY = "medium";
export const DEFAULT_OPENAI_OUTPUT_FORMAT = "webp";
/**
 * GPT Image 2 processes image inputs at high fidelity automatically, so we do NOT
 * send an `input_fidelity` parameter (it is invalid for gpt-image-2). Recorded as
 * result metadata only — never an employee control.
 */
export const OPENAI_INPUT_FIDELITY_METADATA = "automatic-high";

/**
 * Rough internal cost estimate (USD) per image from configuration — internal/admin
 * metadata only, never an employee control. Tune as pricing is confirmed.
 */
const QUALITY_COST_USD: Record<string, number> = { low: 0.01, medium: 0.04, high: 0.17, auto: 0.04 };

export function estimateImageCostUsd(quality: string, count = 1): number {
  const per = QUALITY_COST_USD[quality.toLowerCase()] ?? QUALITY_COST_USD.medium;
  return Math.round(per * count * 1000) / 1000;
}
