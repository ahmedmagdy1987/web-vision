"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MapPin, MapPinned, Plus, SearchX } from "lucide-react";
import type { Location } from "@/lib/domain";
import { useActiveProject, useLocations, useMounted } from "@/lib/hooks";
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
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
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
  const { project, projects } = useActiveProject();

  const [search, setSearch] = React.useState("");
  const [usageFilter, setUsageFilter] = React.useState<UsageFilter>("all");
  const [scope, setScope] = React.useState<"active" | "all">("active");
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Location | null>(null);

  const selectedProject = scope === "active" ? project : null;

  const projectNameFor = React.useCallback(
    (location: Location) => projects.find((p) => p.locationIds.includes(location.id))?.name,
    [projects],
  );

  const filtered = React.useMemo(() => {
    return locations
      .filter((l) => {
        if (usageFilter !== "all" && l.usage !== usageFilter) return false;
        if (selectedProject && !selectedProject.locationIds.includes(l.id)) return false;
        return matchesSearch(l, search);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [locations, usageFilter, selectedProject, search]);

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
    router.push("/studio");
  };

  const isFiltering = usageFilter !== "all" || search.trim().length > 0;
  const projectHasNoLocations = Boolean(selectedProject) && filtered.length === 0 && !isFiltering;

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
          <Select value={scope} onValueChange={(v) => setScope(v as "active" | "all")}>
            <SelectTrigger size="sm" className="w-auto min-w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{project ? project.name : "Current project"}</SelectItem>
              <SelectItem value="all">All locations</SelectItem>
            </SelectContent>
          </Select>
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
      ) : projectHasNoLocations ? (
        <EmptyState
          icon={MapPin}
          title="No locations available for this project"
          description="Upload a client site in Locations to continue, or switch to “All locations”."
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
          </p>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                projectName={projectNameFor(location)}
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
        activeProjectId={project?.id}
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
