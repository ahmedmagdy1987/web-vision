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
 * Sizes the Images Edit API actually accepts. We never send anything else.
 */
export const VALID_OPENAI_NATIVE_SIZES = ["auto", "1024x1024", "1536x1024", "1024x1536"] as const;
export type OpenAINativeSize = (typeof VALID_OPENAI_NATIVE_SIZES)[number];

/**
 * Provider-native size REQUESTED FROM OpenAI per aspect ratio — must be one of
 * {@link VALID_OPENAI_NATIVE_SIZES}. Portrait ratios use 1024x1536, landscape use
 * 1536x1024, square uses 1024x1024.
 */
const OPENAI_NATIVE_SIZES: Record<AspectRatio, { width: number; height: number; size: OpenAINativeSize }> = {
  "1:1": { width: 1024, height: 1024, size: "1024x1024" },
  "4:5": { width: 1024, height: 1536, size: "1024x1536" },
  "16:9": { width: 1536, height: 1024, size: "1536x1024" },
  "9:16": { width: 1024, height: 1536, size: "1024x1536" },
  // Secondary ratios (not in the primary workflow) → nearest valid native size.
  "4:3": { width: 1536, height: 1024, size: "1536x1024" },
  "3:2": { width: 1536, height: 1024, size: "1536x1024" },
  "2:3": { width: 1024, height: 1536, size: "1024x1536" },
};

/**
 * The application's EXACT requested final dimensions after server-side
 * post-processing (a deterministic centered crop of the native image — never an
 * upscale or stretch).
 */
const FINAL_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "16:9": { width: 1536, height: 864 },
  "9:16": { width: 864, height: 1536 },
  // Secondary ratios → cropped from their native size.
  "4:3": { width: 1536, height: 1152 },
  "3:2": { width: 1536, height: 1024 },
  "2:3": { width: 1024, height: 1536 },
};

export function openAiNativeSize(ratio: AspectRatio): { width: number; height: number; size: OpenAINativeSize } {
  return OPENAI_NATIVE_SIZES[ratio] ?? OPENAI_NATIVE_SIZES["1:1"];
}

export function finalSize(ratio: AspectRatio): { width: number; height: number } {
  return FINAL_SIZES[ratio] ?? FINAL_SIZES["1:1"];
}

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
/** High input fidelity preserves product geometry, materials, branding + logo lettering. */
export const OPENAI_INPUT_FIDELITY = "high";

/**
 * Rough internal cost estimate (USD) per image from configuration — internal/admin
 * metadata only, never an employee control. Tune as pricing is confirmed.
 */
const QUALITY_COST_USD: Record<string, number> = { low: 0.01, medium: 0.04, high: 0.17, auto: 0.04 };

export function estimateImageCostUsd(quality: string, count = 1): number {
  const per = QUALITY_COST_USD[quality.toLowerCase()] ?? QUALITY_COST_USD.medium;
  return Math.round(per * count * 1000) / 1000;
}
