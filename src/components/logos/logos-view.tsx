"use client";

import * as React from "react";
import { ImageIcon, UploadCloud } from "lucide-react";
import { useBrands, useMounted, useResults } from "@/lib/hooks";
import { brandRepository } from "@/lib/repositories";
import { isLogoReferenced } from "@/lib/services/asset-references";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BulkDeleteDialog, type BulkDeleteItem } from "@/components/common/bulk-delete-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { SelectionBar } from "@/components/common/selection-bar";
import { LogoCard } from "@/components/identity/logo-card";
import { LogoUploadDialog } from "@/components/home/logo-upload-dialog";

/**
 * Logo Library — a flat grid of every logo. No accent palette, descriptions,
 * counts, identity summary or readiness. Primary action is "Upload logo"; the
 * backend brand entity (the container for a logo) is created transparently.
 */
export function LogosView() {
  const brands = useBrands();
  const mounted = useMounted();
  const results = useResults();
  const [search, setSearch] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = React.useState(false);

  const items = React.useMemo(
    () =>
      brands
        .filter((b) => b.status === "active")
        .flatMap((b) =>
          b.logos
            .filter((l) => (showArchived ? true : l.status === "active"))
            .map((logo) => ({ brand: b, logo, isDefault: b.defaultLogoId === logo.id })),
        ),
    [brands, showArchived],
  );

  const term = search.trim().toLowerCase();
  const visible = term ? items.filter((i) => i.brand.name.toLowerCase().includes(term)) : items;

  // Map each logo id back to its containing brand so bulk actions (keyed by a
  // single id) can resolve the brandId they need.
  const byLogoId = React.useMemo(() => new Map(items.map((i) => [i.logo.id, i])), [items]);
  const visibleIds = React.useMemo(() => new Set(visible.map((i) => i.logo.id)), [visible]);
  const visibleSelectedIds = React.useMemo(
    () => selectedIds.filter((id) => visibleIds.has(id)),
    [selectedIds, visibleIds],
  );
  const bulkItems: BulkDeleteItem[] = React.useMemo(
    () =>
      visibleSelectedIds.flatMap((id) => {
        const entry = byLogoId.get(id);
        if (!entry) return [];
        return [
          {
            id: entry.logo.id,
            name: entry.brand.name,
            thumbnailUrl: entry.logo.asset.url,
            referenced: isLogoReferenced(results, entry.logo.id),
          },
        ];
      }),
    [visibleSelectedIds, byLogoId, results],
  );
  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);

  const uploadButton = (
    <Button onClick={() => setUploadOpen(true)}>
      <UploadCloud className="size-4" />
      Upload logo
    </Button>
  );

  return (
    <div className="space-y-6 pb-24">
      <PageHeader title="Logos" description="Your logo library — upload and manage the logos used in mockups." actions={uploadButton} />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={search} onValueChange={setSearch} placeholder="Search logos…" containerClassName="sm:max-w-xs" />
        <Button variant={showArchived ? "default" : "outline"} size="sm" onClick={() => setShowArchived((v) => !v)}>
          Show archived
        </Button>
      </div>

      {!mounted ? (
        <GridSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No logos yet"
          description="Upload a logo to start generating mockups."
          action={uploadButton}
        />
      ) : visible.length === 0 ? (
        <EmptyState icon={ImageIcon} title="No logos match" description="Try a different search term." />
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ brand, logo, isDefault }) => (
            <LogoCard
              key={logo.id}
              logo={logo}
              brandId={brand.id}
              isDefault={isDefault}
              name={brand.name}
              selected={selectedIds.includes(logo.id)}
              onToggleSelect={toggleSelect}
            />
          ))}
        </ul>
      )}

      <LogoUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />

      <SelectionBar
        count={visibleSelectedIds.length}
        noun="logo"
        onClear={clearSelection}
        onDelete={() => visibleSelectedIds.length > 0 && setBulkDeleteOpen(true)}
      />

      <BulkDeleteDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        assetTypePlural="logos"
        items={bulkItems}
        archive={(id) => {
          const brandId = byLogoId.get(id)?.brand.id;
          if (brandId) brandRepository.setLogoStatus(brandId, id, "archived");
        }}
        remove={async (id) => {
          const brandId = byLogoId.get(id)?.brand.id;
          if (brandId) await brandRepository.removeLogo(brandId, id);
        }}
        refresh={() => brandRepository.refresh()}
        onResult={(failed) => setSelectedIds(failed)}
      />
    </div>
  );
}

function GridSkeleton() {
  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="overflow-hidden rounded-xl border">
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-5 w-16" />
          </div>
        </li>
      ))}
    </ul>
  );
}
