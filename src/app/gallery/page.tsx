"use client";

import * as React from "react";
import Link from "next/link";
import { ImageIcon, LayoutGrid, List, SearchX } from "lucide-react";
import {
  appStore,
  useAppState,
  useBrands,
  useLocations,
  useMounted,
  useProducts,
  useProjects,
  useResults,
} from "@/lib/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  GalleryCollection,
  GallerySkeleton,
  type GalleryView,
} from "@/components/gallery/gallery-collection";
import { GalleryFilters } from "@/components/gallery/gallery-filters";
import { GalleryMobileFilters } from "@/components/gallery/gallery-mobile-filters";
import {
  DEFAULT_FILTERS,
  applyGalleryFilters,
  hasActiveFilters,
  type GalleryFilterState,
} from "@/components/gallery/filters";

export default function GalleryPage() {
  const mounted = useMounted();
  const results = useResults();
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const projects = useProjects();
  const { searchQuery } = useAppState();

  const [view, setView] = React.useState<GalleryView>("grid");
  const [filters, setFilters] = React.useState<GalleryFilterState>(DEFAULT_FILTERS);

  const filtered = React.useMemo(
    () => applyGalleryFilters(results, filters, searchQuery),
    [results, filters, searchQuery],
  );

  const totalCount = results.length;
  const filtersActive = hasActiveFilters(filters) || searchQuery.trim().length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gallery"
        description="Browse, review and reuse every generated mockup."
        actions={
          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => {
              if (value) setView(value as GalleryView);
            }}
            aria-label="Switch gallery view"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view">
              <LayoutGrid className="size-4" />
              <span className="hidden sm:inline">Grid</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view">
              <List className="size-4" />
              <span className="hidden sm:inline">List</span>
            </ToggleGroupItem>
          </ToggleGroup>
        }
      />

      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onValueChange={(value) => appStore.setSearchQuery(value)}
          placeholder="Search by brand, product, location or notes…"
          containerClassName="max-w-md"
          aria-label="Search results"
        />

        <div className="hidden md:block">
          <GalleryFilters
            projects={projects}
            brands={brands}
            products={products}
            locations={locations}
            filters={filters}
            onChange={setFilters}
          />
        </div>
        <div className="md:hidden">
          <GalleryMobileFilters
            projects={projects}
            brands={brands}
            products={products}
            locations={locations}
            filters={filters}
            onChange={setFilters}
          />
        </div>
      </div>

      {!mounted ? (
        <GallerySkeleton view={view} />
      ) : totalCount === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No mockups yet"
          description="Generated results appear here. Head to the Studio to compose and generate your first visual."
          action={
            <Button asChild>
              <Link href="/studio">Open Studio</Link>
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching results"
          description="No mockups match the current search and filters. Try clearing them to see everything."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setFilters(DEFAULT_FILTERS);
                appStore.setSearchQuery("");
              }}
            >
              Clear search & filters
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <p className="text-muted-foreground text-sm" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "result" : "results"}
            {filtersActive && totalCount !== filtered.length ? ` of ${totalCount}` : ""}
          </p>
          <GalleryCollection results={filtered} view={view} />
        </div>
      )}
    </div>
  );
}
