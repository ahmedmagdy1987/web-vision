"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Palette, Plus } from "lucide-react";
import type { Brand } from "@/lib/domain";
import { useActiveBrand, useAppState, useBrands, useLocations, useMounted, useProducts } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { BrandCard } from "./brand-card";
import { BrandFormDialog } from "./brand-form-dialog";
import { BrandManagerSheet } from "./brand-manager-sheet";
import { IdentitySummary } from "./identity-summary";

type StatusFilter = "active" | "archived" | "all";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

/**
 * Reads the `?new=1` deep-link inside a Suspense boundary (required for
 * useSearchParams in a production build) and signals the parent once.
 */
function NewBrandParam({ onRequestNew }: { onRequestNew: () => void }) {
  const params = useSearchParams();
  const wantsNew = params.get("new") === "1";
  const firedRef = React.useRef(false);

  // Fire the parent callback from a committed effect (not during render) so we
  // never update IdentityView while NewBrandParam is rendering.
  React.useEffect(() => {
    if (wantsNew && !firedRef.current) {
      firedRef.current = true;
      onRequestNew();
    }
  }, [wantsNew, onRequestNew]);

  return null;
}

export function IdentityView() {
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const mounted = useMounted();
  const { selectedBrandId } = useAppState();
  const { brand: currentBrand } = useActiveBrand();

  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<StatusFilter>("active");

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Brand | null>(null);

  const [managerOpen, setManagerOpen] = React.useState(false);
  const [managedId, setManagedId] = React.useState<string | null>(null);

  // Keep the managed brand object in sync with live repository data so logo /
  // status edits made inside the sheet re-render it immediately.
  const managedBrand = managedId ? brands.find((b) => b.id === managedId) ?? null : null;

  const openAdd = React.useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openManage = (brand: Brand) => {
    setManagedId(brand.id);
    setManagerOpen(true);
  };

  const openEdit = (brand: Brand) => {
    setEditing(brand);
    setFormOpen(true);
  };

  const query = search.trim().toLowerCase();
  const matchesSearch = (b: Brand) =>
    query.length === 0 ||
    b.name.toLowerCase().includes(query) ||
    (b.description?.toLowerCase().includes(query) ?? false);

  const matchesFilter = (b: Brand) => filter === "all" || b.status === filter;

  const visible = brands.filter((b) => matchesFilter(b) && matchesSearch(b));
  const activeCount = brands.filter((b) => b.status === "active").length;
  const archivedCount = brands.filter((b) => b.status === "archived").length;

  const counts: Record<StatusFilter, number> = {
    active: activeCount,
    archived: archivedCount,
    all: brands.length,
  };

  return (
    <div className="space-y-6">
      <React.Suspense fallback={null}>
        <NewBrandParam onRequestNew={openAdd} />
      </React.Suspense>

      <PageHeader
        title="Identity"
        description="Manage your brands, accents, and logo assets that power every generation."
        actions={
          <Button onClick={openAdd}>
            <Plus />
            Add brand
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Search brands…"
          containerClassName="sm:max-w-xs"
        />
        <div className="inline-flex h-9 w-fit items-center rounded-lg bg-muted p-1 text-muted-foreground">
          {FILTERS.map((f) => {
            const selected = filter === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={selected}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-ring/50",
                  selected ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
                )}
              >
                {f.label}
                <span className="text-[11px] tabular-nums opacity-70">{counts[f.value]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {!mounted ? (
        <BrandGridSkeleton />
      ) : brands.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No brands yet"
          description="Create your first brand to start generating on-brand visuals."
          action={
            <Button onClick={openAdd}>
              <Plus />
              Add your first brand
            </Button>
          }
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="No brands match"
          description={
            query
              ? "Try a different search term or status filter."
              : `No ${filter} brands. Switch the filter to see more.`
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              onManage={openManage}
              isCurrent={brand.id === (selectedBrandId ?? currentBrand?.id)}
            />
          ))}
        </div>
      )}

      {mounted && currentBrand && brands.length > 0 && (
        <IdentitySummary
          brand={currentBrand}
          productCount={products.filter((p) => p.brandId === currentBrand.id).length}
          locationCount={locations.filter((l) => l.brandId === currentBrand.id).length}
          onEdit={openEdit}
          onManage={openManage}
        />
      )}

      <BrandFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        brand={editing}
        selectOnCreate
      />

      <BrandManagerSheet
        brand={managedBrand}
        open={managerOpen}
        onOpenChange={setManagerOpen}
        onEdit={openEdit}
      />
    </div>
  );
}

function BrandGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="h-1.5 w-full rounded-none" />
          <div className="flex items-start gap-4 p-5">
            <Skeleton className="size-14 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          </div>
          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
