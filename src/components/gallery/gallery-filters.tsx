"use client";

import * as React from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, RotateCcw, Star } from "lucide-react";
import type { Brand, ID, Location, Product, Project, ResultReview } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEFAULT_FILTERS,
  hasActiveFilters,
  type GalleryFilterState,
  type GallerySort,
} from "./filters";

const REVIEW_OPTIONS: { value: ResultReview; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

interface GalleryFiltersProps {
  projects: Project[];
  brands: Brand[];
  products: Product[];
  locations: Location[];
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
}

export function GalleryFilters({ brands, products, locations, filters, onChange }: GalleryFiltersProps) {
  const patch = React.useCallback(
    (partial: Partial<GalleryFilterState>) => onChange({ ...filters, ...partial }),
    [filters, onChange],
  );

  // When a brand is selected, only offer that brand's products/locations.
  const visibleProducts = React.useMemo(
    () => (filters.brandId === "all" ? products : products.filter((p) => p.brandId === filters.brandId)),
    [products, filters.brandId],
  );
  const visibleLocations = React.useMemo(
    () =>
      filters.brandId === "all"
        ? locations
        : locations.filter((l) => l.brandId === filters.brandId || l.brandId === undefined),
    [locations, filters.brandId],
  );

  const handleBrandChange = (value: string) => {
    const brandId = value as ID | "all";
    // Reset dependent filters that may no longer be valid.
    patch({ brandId, productId: "all", locationId: "all" });
  };

  const active = hasActiveFilters(filters);

  return (
    <div className="bg-card/60 flex flex-col gap-4 rounded-xl border p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterField id="filter-brand" label="Brand">
          <Select value={filters.brandId} onValueChange={handleBrandChange}>
            <SelectTrigger id="filter-brand" size="sm" aria-label="Filter by brand">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  {brand.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField id="filter-product" label="Product">
          <Select value={filters.productId} onValueChange={(v) => patch({ productId: v as ID | "all" })}>
            <SelectTrigger id="filter-product" size="sm" aria-label="Filter by product">
              <SelectValue placeholder="All products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All products</SelectItem>
              {visibleProducts.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField id="filter-location" label="Location">
          <Select value={filters.locationId} onValueChange={(v) => patch({ locationId: v as ID | "all" })}>
            <SelectTrigger id="filter-location" size="sm" aria-label="Filter by location">
              <SelectValue placeholder="All locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {visibleLocations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>

        <FilterField id="filter-review" label="Status">
          <Select value={filters.review} onValueChange={(v) => patch({ review: v as ResultReview | "all" })}>
            <SelectTrigger id="filter-review" size="sm" aria-label="Filter by review status">
              <SelectValue placeholder="Any status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              {REVIEW_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterField>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={filters.favoritesOnly ? "default" : "outline"}
            size="sm"
            aria-pressed={filters.favoritesOnly}
            onClick={() => patch({ favoritesOnly: !filters.favoritesOnly })}
          >
            <Star className={cn("size-4", filters.favoritesOnly && "fill-current")} />
            Favorites
          </Button>

          {active && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}>
              <RotateCcw className="size-4" />
              Clear filters
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="filter-sort" className="text-muted-foreground text-xs">
            Sort
          </Label>
          <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as GallerySort })}>
            <SelectTrigger id="filter-sort" size="sm" className="w-[140px]" aria-label="Sort results">
              <span className="flex items-center gap-2">
                {filters.sort === "newest" ? (
                  <ArrowDownWideNarrow className="size-4" />
                ) : (
                  <ArrowUpWideNarrow className="size-4" />
                )}
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function FilterField({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-muted-foreground text-xs">
        {label}
      </Label>
      {children}
    </div>
  );
}
