import type { GenerationResult, ID, ResultReview } from "@/lib/domain";

export type GallerySort = "newest" | "oldest";

export interface GalleryFilterState {
  projectId: ID | "all";
  brandId: ID | "all";
  productId: ID | "all";
  locationId: ID | "all";
  review: ResultReview | "all";
  favoritesOnly: boolean;
  sort: GallerySort;
}

export const DEFAULT_FILTERS: GalleryFilterState = {
  projectId: "all",
  brandId: "all",
  productId: "all",
  locationId: "all",
  review: "all",
  favoritesOnly: false,
  sort: "newest",
};

/** Whether any filter (other than sort) deviates from defaults. */
export function hasActiveFilters(filters: GalleryFilterState): boolean {
  return (
    filters.projectId !== "all" ||
    filters.brandId !== "all" ||
    filters.productId !== "all" ||
    filters.locationId !== "all" ||
    filters.review !== "all" ||
    filters.favoritesOnly
  );
}

/** Count of active filter facets (for the filter button badge). */
export function activeFilterCount(filters: GalleryFilterState): number {
  let count = 0;
  if (filters.projectId !== "all") count++;
  if (filters.brandId !== "all") count++;
  if (filters.productId !== "all") count++;
  if (filters.locationId !== "all") count++;
  if (filters.review !== "all") count++;
  if (filters.favoritesOnly) count++;
  return count;
}

/** Apply text search + filters + sort to the result list. */
export function applyGalleryFilters(
  results: GenerationResult[],
  filters: GalleryFilterState,
  query: string,
): GenerationResult[] {
  const term = query.trim().toLowerCase();

  const matched = results.filter((result) => {
    const { snapshot } = result;

    if (filters.projectId !== "all" && result.projectId !== filters.projectId) return false;
    if (filters.brandId !== "all" && snapshot.brandId !== filters.brandId) return false;
    if (filters.productId !== "all" && !snapshot.productIds.includes(filters.productId)) return false;
    if (filters.locationId !== "all" && snapshot.locationId !== filters.locationId) return false;
    if (filters.review !== "all" && result.review !== filters.review) return false;
    if (filters.favoritesOnly && !result.favorite) return false;

    if (term) {
      const haystack = [
        snapshot.brandName,
        snapshot.locationName ?? "",
        snapshot.notes ?? "",
        ...snapshot.productNames,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(term)) return false;
    }

    return true;
  });

  const sorted = [...matched].sort((a, b) => {
    const at = new Date(a.createdAt).getTime();
    const bt = new Date(b.createdAt).getTime();
    return filters.sort === "newest" ? bt - at : at - bt;
  });

  return sorted;
}
