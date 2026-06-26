/**
 * How many historical Gallery results reference an asset, and whether any do.
 * Scans the denormalized result snapshots (the source of truth for what a past
 * mockup used). A referenced asset cannot be permanently deleted without the
 * user explicitly choosing to (its mockups keep their generated images + names
 * regardless, since the snapshot is self-contained — see ResultSnapshot).
 */
import type { GenerationResult } from "@/lib/domain";

export function countProductReferences(results: GenerationResult[], productId: string): number {
  return results.filter((r) => r.snapshot.productIds?.includes(productId)).length;
}

export function countLocationReferences(results: GenerationResult[], locationId: string): number {
  return results.filter((r) => r.snapshot.locationId === locationId).length;
}

export function countLogoReferences(results: GenerationResult[], logoId: string): number {
  return results.filter((r) => r.snapshot.logoId === logoId).length;
}

export function isProductReferenced(results: GenerationResult[], productId: string): boolean {
  return countProductReferences(results, productId) > 0;
}

export function isLocationReferenced(results: GenerationResult[], locationId: string): boolean {
  return countLocationReferences(results, locationId) > 0;
}

export function isLogoReferenced(results: GenerationResult[], logoId: string): boolean {
  return countLogoReferences(results, logoId) > 0;
}
