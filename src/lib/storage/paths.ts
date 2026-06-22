/**
 * Deterministic, collision-resistant, organization-scoped storage object paths.
 *
 * Layout (single private bucket "web-vision"):
 *   organizations/{orgId}/brands/{brandId}/{assetId}.{ext}
 *   organizations/{orgId}/products/{productId}/{assetId}.{ext}
 *   organizations/{orgId}/locations/{locationId}/{assetId}.{ext}
 *   organizations/{orgId}/results/{jobId}/{resultId}.{ext}
 *
 * The {orgId} segment (path index 2) is what the storage RLS policies authorize
 * against, so every path MUST start at the org root. Segments are sanitized to
 * prevent path traversal.
 */
import type { ID } from "@/lib/domain";

export const STORAGE_BUCKET = "web-vision";

const EXT_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/gif": "gif",
  "image/avif": "avif",
};

export function extensionForMime(mime: string): string {
  return EXT_BY_MIME[mime] ?? "bin";
}

/** Sanitize a single path segment; rejects empty, "." / ".." and separators. */
export function sanitizeSegment(seg: string): string {
  const cleaned = (seg ?? "").replace(/[^a-zA-Z0-9._-]/g, "");
  if (!cleaned || cleaned === "." || cleaned === "..") {
    throw new Error(`Invalid storage path segment: ${JSON.stringify(seg)}`);
  }
  return cleaned;
}

/** Unique, traversal-safe object filename: "<id>.<ext>". */
export function assetFilename(assetId: ID, mime: string): string {
  return `${sanitizeSegment(assetId)}.${extensionForMime(mime)}`;
}

export function orgRoot(orgId: ID): string {
  return `organizations/${sanitizeSegment(orgId)}`;
}

export function brandAssetPath(orgId: ID, brandId: ID, assetId: ID, mime: string): string {
  return `${orgRoot(orgId)}/brands/${sanitizeSegment(brandId)}/${assetFilename(assetId, mime)}`;
}

export function productAssetPath(orgId: ID, productId: ID, assetId: ID, mime: string): string {
  return `${orgRoot(orgId)}/products/${sanitizeSegment(productId)}/${assetFilename(assetId, mime)}`;
}

export function locationAssetPath(orgId: ID, locationId: ID, assetId: ID, mime: string): string {
  return `${orgRoot(orgId)}/locations/${sanitizeSegment(locationId)}/${assetFilename(assetId, mime)}`;
}

export function resultPath(orgId: ID, jobId: ID, resultId: ID, mime: string): string {
  return `${orgRoot(orgId)}/results/${sanitizeSegment(jobId)}/${assetFilename(resultId, mime)}`;
}

/** The org id embedded in a path, or null when the path is not org-scoped. */
export function orgIdFromPath(path: string): ID | null {
  const parts = path.split("/");
  return parts[0] === "organizations" && parts[1] ? parts[1] : null;
}
