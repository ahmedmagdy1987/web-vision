import type { AspectRatio } from "@/lib/domain";

/**
 * Image-generation provider selection + GPT Image 2 output mapping. This module
 * is isomorphic (safe to import on client and server) and contains NO secrets —
 * the API key only ever lives in the server-only modules.
 */

export type ImageProvider = "mock" | "openai";

/**
 * Resolve the configured provider. Selection is EXPLICIT and never silently
 * falls back to mock: an unknown value throws. Defaults to "mock".
 *
 * Server contexts read `IMAGE_GENERATION_PROVIDER`; the browser bundle only sees
 * `NEXT_PUBLIC_IMAGE_GENERATION_PROVIDER` (a non-secret mirror used purely to
 * choose which client adapter to instantiate — the actual OpenAI call is always
 * server-side).
 */
export function getImageProvider(): ImageProvider {
  const raw =
    process.env.IMAGE_GENERATION_PROVIDER ??
    process.env.NEXT_PUBLIC_IMAGE_GENERATION_PROVIDER ??
    "mock";
  return parseImageProvider(raw);
}

export function parseImageProvider(raw: string): ImageProvider {
  const value = raw.trim().toLowerCase();
  if (value === "mock" || value === "openai") return value;
  throw new Error(`Invalid image provider "${raw}" — expected "mock" or "openai".`);
}

/**
 * GPT Image 2 output sizes mapped from our aspect ratios. The four primary
 * workflow ratios use the exact sizes from the provider spec; the secondary
 * ratios map to the nearest supported size. Validate against the current
 * GPT Image 2 size constraints before enabling the provider.
 */
export const OPENAI_IMAGE_SIZES: Record<AspectRatio, { width: number; height: number }> = {
  "1:1": { width: 1024, height: 1024 },
  "4:5": { width: 1024, height: 1280 },
  "16:9": { width: 1536, height: 864 },
  "9:16": { width: 864, height: 1536 },
  // Secondary ratios (not in the primary workflow) → nearest supported size.
  "4:3": { width: 1024, height: 1024 },
  "3:2": { width: 1536, height: 864 },
  "2:3": { width: 1024, height: 1280 },
};

export function openAiSizeForAspect(ratio: AspectRatio): { width: number; height: number; size: string } {
  const dims = OPENAI_IMAGE_SIZES[ratio] ?? OPENAI_IMAGE_SIZES["1:1"];
  return { ...dims, size: `${dims.width}x${dims.height}` };
}

/**
 * Maximum number of input reference images sent to the provider, to bound cost
 * and request size. Additional optional product references can be enabled later.
 */
export function getReferenceLimit(): number {
  const raw = process.env.OPENAI_IMAGE_REFERENCE_LIMIT;
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 6;
}

export const DEFAULT_OPENAI_MODEL = "gpt-image-2";
export const DEFAULT_OPENAI_QUALITY = "medium";
export const DEFAULT_OPENAI_OUTPUT_FORMAT = "webp";

/**
 * Rough internal cost estimate (USD) for one image, derived from configuration
 * rather than hardcoded UI copy. Intended for internal/admin metadata only —
 * never shown as a confusing employee control. Tune the table as pricing is
 * confirmed with the owner.
 */
const QUALITY_COST_USD: Record<string, number> = {
  low: 0.01,
  medium: 0.04,
  high: 0.17,
  auto: 0.04,
};

export function estimateImageCostUsd(quality: string, count = 1): number {
  const per = QUALITY_COST_USD[quality.toLowerCase()] ?? QUALITY_COST_USD.medium;
  return Math.round(per * count * 1000) / 1000;
}
