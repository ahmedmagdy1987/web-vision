/**
 * Explicit database-row ↔ domain mappers. Pure functions (unit-tested) so the
 * Supabase repositories stay thin. Private-storage object paths are resolved to
 * signed URLs by the caller and passed in via `sign`.
 */
import type {
  Brand,
  GenerationJob,
  GenerationRequest,
  GenerationResult,
  ImageAsset,
  JobStatus,
  Location,
  LogoAsset,
  Product,
  ProductDimensions,
  ResultReview,
  ResultSnapshot,
} from "@/lib/domain";
import { DEFAULT_GENERATION_SETTINGS } from "@/lib/domain";
import { safeAccent } from "@/lib/theme/brand-accent";
import type {
  BrandAssetRow,
  BrandRow,
  GenerationJobRow,
  GenerationResultRow,
  JobStatusDb,
  LocationAssetRow,
  LocationRow,
  ProductAssetRow,
  ProductRow,
  ReviewStatusDb,
} from "@/lib/supabase/database.types";

/** Resolve a storage object path to a (signed) URL; "" when unknown. */
export type SignUrl = (storagePath: string) => string;

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "item"
  );
}

export function filenameFromPath(path: string): string {
  return path.split("/").pop() ?? path;
}

/** Domain JobStatus (4) from the DB superset (6). */
export function jobStatusFromDb(status: JobStatusDb): JobStatus {
  switch (status) {
    case "draft":
      return "queued";
    case "cancelled":
      return "failed";
    case "queued":
    case "processing":
    case "completed":
    case "failed":
      return status;
    default:
      return "queued";
  }
}

export function reviewFromDb(status: ReviewStatusDb): ResultReview {
  return status;
}

/* ------------------------------- brands -------------------------------- */
export function brandAssetToLogo(a: BrandAssetRow, sign: SignUrl): LogoAsset {
  const asset: ImageAsset = {
    id: a.id,
    url: sign(a.storage_path),
    name: a.name,
    mimeType: a.mime_type,
    size: a.size_bytes ?? 0,
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    createdAt: a.created_at,
  };
  return {
    id: a.id,
    brandId: a.brand_id,
    asset,
    kind: a.asset_type,
    status: a.status,
    instructions: a.instructions ?? undefined,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
  };
}

export function brandFromRow(brand: BrandRow, assets: BrandAssetRow[], sign: SignUrl): Brand {
  return {
    id: brand.id,
    name: brand.name,
    accentColor: brand.accent_color,
    description: brand.description ?? undefined,
    instructions: brand.instructions ?? undefined,
    logos: assets.map((a) => brandAssetToLogo(a, sign)),
    defaultLogoId: brand.default_logo_id ?? undefined,
    status: brand.status,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at,
  };
}

/* ------------------------------ products ------------------------------- */
function productAssetToImage(a: ProductAssetRow, sign: SignUrl): ImageAsset {
  return {
    id: a.id,
    url: sign(a.storage_path),
    name: filenameFromPath(a.storage_path),
    mimeType: a.mime_type,
    size: a.size_bytes ?? 0,
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    createdAt: a.created_at,
  };
}

export function productFromRow(
  product: ProductRow,
  assets: ProductAssetRow[],
  categoryName: string | undefined,
  sign: SignUrl,
): Product {
  const ordered = [...assets].sort((a, b) => a.sort_order - b.sort_order);
  const mainRow = ordered.find((a) => a.is_primary) ?? ordered.find((a) => a.asset_role === "main");
  const referenceRows = ordered.filter((a) => a.id !== mainRow?.id);
  return {
    id: product.id,
    brandId: product.brand_id,
    name: product.name,
    category: categoryName ?? "",
    tags: product.tags ?? [],
    description: product.description ?? undefined,
    dimensions: (product.dimensions as ProductDimensions | null) ?? undefined,
    usage: product.usage,
    mainImage: mainRow ? productAssetToImage(mainRow, sign) : undefined,
    referenceImages: referenceRows.map((a) => productAssetToImage(a, sign)),
    preservationInstructions: product.preservation_instructions ?? undefined,
    status: product.status,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/* ------------------------------ locations ------------------------------ */
function locationAssetToImage(a: LocationAssetRow, sign: SignUrl): ImageAsset {
  return {
    id: a.id,
    url: sign(a.storage_path),
    name: filenameFromPath(a.storage_path),
    mimeType: a.mime_type,
    size: a.size_bytes ?? 0,
    width: a.width ?? undefined,
    height: a.height ?? undefined,
    createdAt: a.created_at,
  };
}

export function locationFromRow(loc: LocationRow, assets: LocationAssetRow[], sign: SignUrl): Location {
  const images = [...assets].sort((a, b) => a.sort_order - b.sort_order).map((a) => locationAssetToImage(a, sign));
  return {
    id: loc.id,
    name: loc.name,
    brandId: loc.brand_id ?? undefined,
    usage: loc.environment_type,
    images,
    mainImageId: loc.main_image_id ?? images[0]?.id,
    description: loc.description ?? undefined,
    preservationInstructions: loc.preservation_instructions ?? undefined,
    saved: true,
    status: loc.status ?? "active",
    createdAt: loc.created_at,
    updatedAt: loc.updated_at,
  };
}

/* ------------------------- jobs & results ------------------------------ */
export function jobFromRow(row: GenerationJobRow, resultIds: string[]): GenerationJob {
  const request = row.request as unknown as GenerationRequest;
  return {
    id: row.id,
    request,
    status: jobStatusFromDb(row.status),
    progress: row.progress,
    error: row.error_message ?? undefined,
    resultIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at ?? undefined,
  };
}

/**
 * Normalize a stored result snapshot into a COMPLETE, presentation-safe domain
 * shape. Older mock records, server-created OpenAI records and any legacy
 * incomplete record all map to the same shape with safe fallbacks (a valid
 * accent, a brand name, arrays for product ids/names). Keeps presentation
 * components from having to understand multiple database shapes.
 */
export function normalizeResultSnapshot(raw: unknown): ResultSnapshot {
  const s = (raw && typeof raw === "object" ? raw : {}) as Partial<ResultSnapshot>;
  return {
    brandId: s.brandId ?? "",
    brandName: (typeof s.brandName === "string" && s.brandName.trim()) || "Mockup",
    brandAccent: safeAccent(s.brandAccent),
    logoId: s.logoId,
    logoUrl: s.logoUrl,
    productIds: Array.isArray(s.productIds) ? s.productIds : [],
    productNames: Array.isArray(s.productNames) ? s.productNames : [],
    locationId: s.locationId,
    locationName: s.locationName,
    locationImageUrl: s.locationImageUrl,
    locationDraft: s.locationDraft,
    settings: s.settings ?? DEFAULT_GENERATION_SETTINGS,
    instructions: s.instructions ?? { sections: [], text: "" },
    notes: s.notes,
  };
}

export function resultFromRow(row: GenerationResultRow, sign: SignUrl): GenerationResult {
  const snapshot = normalizeResultSnapshot(row.snapshot);
  const meta = (row.provider_metadata as { requestId?: string } | null) ?? null;
  const image: ImageAsset = {
    id: row.id,
    url: sign(row.storage_path),
    name: `${snapshot.brandName} result ${row.result_index + 1}`,
    mimeType: row.mime_type,
    size: 0,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    createdAt: row.created_at,
  };
  return {
    id: row.id,
    jobId: row.job_id,
    requestId: meta?.requestId ?? row.job_id,
    projectId: row.project_id ?? undefined,
    image,
    index: row.result_index,
    seed: row.seed == null ? undefined : Number(row.seed),
    review: reviewFromDb(row.review_status),
    favorite: row.is_favorite,
    snapshot,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
