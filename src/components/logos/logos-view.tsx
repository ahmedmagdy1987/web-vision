"use client";

import * as React from "react";
import { ImageIcon, UploadCloud } from "lucide-react";
import { useBrands, useMounted } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
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
  const [search, setSearch] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [uploadOpen, setUploadOpen] = React.useState(false);

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

  const uploadButton = (
    <Button onClick={() => setUploadOpen(true)}>
      <UploadCloud className="size-4" />
      Upload logo
    </Button>
  );

  return (
    <div className="space-y-6">
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
            <LogoCard key={logo.id} logo={logo} brandId={brand.id} isDefault={isDefault} name={brand.name} />
          ))}
        </ul>
      )}

      <LogoUploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
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
