/**
 * Whether an asset is referenced by any historical Gallery result. Referenced
 * assets must be ARCHIVED (not deleted) so existing mockups keep their names +
 * images. Scans the denormalized result snapshots (the source of truth for what
 * a past mockup used). Mirrors the existing logo-delete convention.
 */
import type { GenerationResult } from "@/lib/domain";

export function isProductReferenced(results: GenerationResult[], productId: string): boolean {
  return results.some((r) => r.snapshot.productIds?.includes(productId));
}

export function isLocationReferenced(results: GenerationResult[], locationId: string): boolean {
  return results.some((r) => r.snapshot.locationId === locationId);
}

export function isLogoReferenced(results: GenerationResult[], logoId: string): boolean {
  return results.some((r) => r.snapshot.logoId === logoId);
}
