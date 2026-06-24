"use client";

import * as React from "react";
import { ArrowDownWideNarrow, ArrowUpWideNarrow, SlidersHorizontal, X } from "lucide-react";
import type { Brand, Location, Product, Project } from "@/lib/domain";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { GalleryFilters } from "./gallery-filters";
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  type GalleryFilterState,
  type GallerySort,
} from "./filters";

interface GalleryMobileFiltersProps {
  projects: Project[];
  brands: Brand[];
  products: Product[];
  locations: Location[];
  filters: GalleryFilterState;
  onChange: (next: GalleryFilterState) => void;
}

interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

const REVIEW_LABELS: Record<string, string> = {
  draft: "Draft",
  approved: "Approved",
  rejected: "Rejected",
};

export function GalleryMobileFilters({ projects, brands, products, locations, filters, onChange }: GalleryMobileFiltersProps) {
  const [open, setOpen] = React.useState(false);
  const count = activeFilterCount(filters);
  const patch = (partial: Partial<GalleryFilterState>) => onChange({ ...filters, ...partial });

  const chips: Chip[] = [];
  if (filters.projectId !== "all") {
    chips.push({
      key: "project",
      label: projects.find((p) => p.id === filters.projectId)?.name ?? "Project",
      onRemove: () => patch({ projectId: "all" }),
    });
  }
  if (filters.brandId !== "all") {
    chips.push({
      key: "brand",
      label: brands.find((b) => b.id === filters.brandId)?.name ?? "Logo",
      onRemove: () => patch({ brandId: "all", productId: "all", locationId: "all" }),
    });
  }
  if (filters.productId !== "all") {
    chips.push({
      key: "product",
      label: products.find((p) => p.id === filters.productId)?.name ?? "Product",
      onRemove: () => patch({ productId: "all" }),
    });
  }
  if (filters.locationId !== "all") {
    chips.push({
      key: "location",
      label: locations.find((l) => l.id === filters.locationId)?.name ?? "Location",
      onRemove: () => patch({ locationId: "all" }),
    });
  }
  if (filters.review !== "all") {
    chips.push({ key: "review", label: REVIEW_LABELS[filters.review] ?? filters.review, onRemove: () => patch({ review: "all" }) });
  }
  if (filters.favoritesOnly) {
    chips.push({ key: "fav", label: "Favorites", onRemove: () => patch({ favoritesOnly: false }) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1.5">
              <SlidersHorizontal className="size-4" />
              Filters
              {count > 0 && (
                <Badge variant="brand" className="ml-0.5 px-1.5">
                  {count}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter results</SheetTitle>
            </SheetHeader>
            <GalleryFilters
              projects={projects}
              brands={brands}
              products={products}
              locations={locations}
              filters={filters}
              onChange={onChange}
            />
            <Button onClick={() => setOpen(false)} className="w-full">
              Show results
            </Button>
          </SheetContent>
        </Sheet>

        <Select value={filters.sort} onValueChange={(v) => patch({ sort: v as GallerySort })}>
          <SelectTrigger size="sm" className="ml-auto w-auto gap-1.5" aria-label="Sort results">
            {filters.sort === "newest" ? (
              <ArrowDownWideNarrow className="size-4" />
            ) : (
              <ArrowUpWideNarrow className="size-4" />
            )}
            <span className="text-xs">{filters.sort === "newest" ? "Newest" : "Oldest"}</span>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className="bg-brand-subtle text-brand border-brand-border inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS, sort: filters.sort })}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
