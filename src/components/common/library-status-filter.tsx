"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type LibraryStatus = "active" | "archived" | "all";

/** Explicit, consistent Active (default) / Archived / All filter for every asset
 *  library (Products, Locations, Logos). */
export function matchesStatusFilter(status: string, filter: LibraryStatus): boolean {
  if (filter === "all") return true;
  if (filter === "archived") return status === "archived";
  return status !== "archived"; // active (default)
}

export function LibraryStatusFilter({
  value,
  onChange,
  className,
}: {
  value: LibraryStatus;
  onChange: (value: LibraryStatus) => void;
  className?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(v) => v && onChange(v as LibraryStatus)}
      aria-label="Filter by status"
      className={className}
    >
      <ToggleGroupItem value="active" aria-label="Active">
        Active
      </ToggleGroupItem>
      <ToggleGroupItem value="archived" aria-label="Archived">
        Archived
      </ToggleGroupItem>
      <ToggleGroupItem value="all" aria-label="All">
        All
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
