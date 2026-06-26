"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPinned, Plus, SearchX } from "lucide-react";
import type { Location } from "@/lib/domain";
import { useLocations, useMounted, useResults } from "@/lib/hooks";
import { locationRepository } from "@/lib/repositories";
import { isLocationReferenced } from "@/lib/services/asset-references";
import { studioPrefill } from "@/lib/store/studio-draft";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BulkDeleteDialog, type BulkDeleteItem } from "@/components/common/bulk-delete-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { SelectionBar } from "@/components/common/selection-bar";
import { LocationCard } from "@/components/locations/location-card";
import { LocationFormDialog } from "@/components/locations/location-form-dialog";

type UsageFilter = "all" | "indoor" | "outdoor";

function matchesSearch(location: Location, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    location.name.toLowerCase().includes(q) ||
    (location.description?.toLowerCase().includes(q) ?? false)
  );
}

export default function LocationsPage() {
  const mounted = useMounted();
  const router = useRouter();
  const locations = useLocations();
  const results = useResults();

  const [search, setSearch] = React.useState("");
  const [usageFilter, setUsageFilter] = React.useState<UsageFilter>("all");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Location | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const filtered = React.useMemo(() => {
    return locations
      .filter((l) => {
        if (usageFilter !== "all" && l.usage !== usageFilter) return false;
        return matchesSearch(l, search);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [locations, usageFilter, search]);

  const filteredIds = React.useMemo(() => new Set(filtered.map((l) => l.id)), [filtered]);
  // Keep the action bar accurate: only count selections that are currently visible.
  const visibleSelectedIds = React.useMemo(
    () => selectedIds.filter((id) => filteredIds.has(id)),
    [selectedIds, filteredIds],
  );

  const bulkItems: BulkDeleteItem[] = React.useMemo(
    () =>
      visibleSelectedIds
        .map((id) => locations.find((l) => l.id === id))
        .filter((l): l is Location => Boolean(l))
        .map((l) => ({
          id: l.id,
          name: l.name,
          thumbnailUrl: (l.images.find((i) => i.id === l.mainImageId) ?? l.images[0])?.url,
          referenced: isLocationReferenced(results, l.id),
        })),
    [visibleSelectedIds, locations, results],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (location: Location) => {
    setEditing(location);
    setFormOpen(true);
  };
  const useInStudio = (location: Location) => {
    studioPrefill.set({ locationId: location.id, source: "locations" });
    router.push("/");
  };

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Locations"
        description="Client sites and venues where games and products are visualized."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add location
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search sites…"
          containerClassName="sm:max-w-xs"
        />
        <div className="flex items-center gap-2">
          <Select value={usageFilter} onValueChange={(v) => setUsageFilter(v as UsageFilter)}>
            <SelectTrigger size="sm" className="w-auto min-w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="indoor">Indoor</SelectItem>
              <SelectItem value="outdoor">Outdoor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!mounted ? (
        <LoadingGrid />
      ) : locations.length === 0 ? (
        <EmptyState
          icon={MapPinned}
          title="No locations yet"
          description="Upload a client site to start visualizing products on location."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Add location
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No locations match your filters"
          description="Try a different search term or clear the filters."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setUsageFilter("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {filtered.length} location{filtered.length === 1 ? "" : "s"}
            {visibleSelectedIds.length > 0 && ` · ${visibleSelectedIds.length} selected`}
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                selected={selectedIds.includes(location.id)}
                onToggleSelect={toggleSelect}
                onEdit={openEdit}
                onUseInStudio={useInStudio}
              />
            ))}
          </div>
        </>
      )}

      <LocationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        location={editing}
      />

      <SelectionBar
        count={visibleSelectedIds.length}
        noun="location"
        onClear={clearSelection}
        onDelete={() => visibleSelectedIds.length > 0 && setBulkDeleteOpen(true)}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        assetTypePlural="locations"
        items={bulkItems}
        archive={(id) => locationRepository.setStatus(id, "archived")}
        remove={(id) => locationRepository.deleteLocation(id)}
        refresh={() => locationRepository.refresh()}
        onResult={(failed) => setSelectedIds(failed)}
      />
    </div>
  );
}

function LoadingGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="gap-0 overflow-hidden p-0">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2.5 p-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-20" />
          </div>
        </Card>
      ))}
    </div>
  );
}
