"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Package, PackageSearch, Plus, SearchX } from "lucide-react";
import type { Product } from "@/lib/domain";
import {
  appStore,
  useActiveBrand,
  useAppState,
  useBrands,
  useMounted,
  useIsMobile,
  useProducts,
  useProjects,
} from "@/lib/hooks";
import { productRepository } from "@/lib/repositories";
import { studioPrefill } from "@/lib/store/studio-draft";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { ProductCard } from "@/components/products/product-card";
import { ProductFormDialog } from "@/components/products/product-form-dialog";
import {
  ALL_VALUE,
  DEFAULT_FILTERS,
  ProductFilters,
  type ProductFilterState,
} from "@/components/products/product-filters";
import { SelectionBar } from "@/components/products/selection-bar";

function matchesSearch(product: Product, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    product.name.toLowerCase().includes(q) ||
    product.category.toLowerCase().includes(q) ||
    (product.description?.toLowerCase().includes(q) ?? false) ||
    product.tags.some((tag) => tag.toLowerCase().includes(q))
  );
}

export default function ProductsPage() {
  const mounted = useMounted();
  const isMobile = useIsMobile();
  const router = useRouter();

  const products = useProducts();
  const brands = useBrands();
  const projects = useProjects();
  const { brand: activeBrand } = useActiveBrand();
  const { searchQuery } = useAppState();

  const [filters, setFilters] = React.useState<ProductFilterState>(DEFAULT_FILTERS);
  const [selectedIds, setSelectedIds] = React.useState<string[]>([]);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<Product | null>(null);

  const brandsById = React.useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  const categories = React.useMemo(() => {
    const set = new Set<string>();
    for (const p of products) if (p.category) set.add(p.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const selectedProject = React.useMemo(
    () => (filters.projectId !== ALL_VALUE ? projects.find((p) => p.id === filters.projectId) : undefined),
    [projects, filters.projectId],
  );

  const filtered = React.useMemo(() => {
    return products
      .filter((p) => {
        if (filters.status !== "all" && p.status !== filters.status) return false;
        if (filters.projectId !== ALL_VALUE && !selectedProject?.productIds.includes(p.id)) return false;
        if (filters.brandId !== ALL_VALUE && p.brandId !== filters.brandId) return false;
        if (filters.category !== ALL_VALUE && p.category !== filters.category) return false;
        if (filters.usage !== "all" && p.usage !== filters.usage) return false;
        return matchesSearch(p, searchQuery);
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [products, filters, searchQuery, selectedProject]);

  const filteredIds = React.useMemo(() => new Set(filtered.map((p) => p.id)), [filtered]);
  // Selection is limited to currently visible products so the action bar stays accurate.
  const visibleSelectedIds = React.useMemo(
    () => selectedIds.filter((id) => filteredIds.has(id)),
    [selectedIds, filteredIds],
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const clearSelection = () => setSelectedIds([]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setFormOpen(true);
  };

  const handleArchiveToggle = (product: Product) => {
    if (product.status === "archived") {
      productRepository.setStatus(product.id, "active");
      toast.success(`Restored “${product.name}”.`);
    } else {
      setArchiveTarget(product);
    }
  };

  const confirmArchive = () => {
    if (!archiveTarget) return;
    productRepository.setStatus(archiveTarget.id, "archived");
    setSelectedIds((prev) => prev.filter((id) => id !== archiveTarget.id));
    toast.success(`Archived “${archiveTarget.name}”.`);
    setArchiveTarget(null);
  };

  const openInStudio = (ids: string[]) => {
    if (ids.length === 0) return;
    const selected = products.filter((p) => ids.includes(p.id));
    const brandIds = new Set(selected.map((p) => p.brandId));
    const commonBrandId =
      brandIds.size === 1 ? selected[0].brandId : activeBrand?.id ?? brands[0]?.id;
    // A mockup composes within a single brand. Carry only the resolved brand's
    // products and tell the user if a cross-brand selection was narrowed.
    const carried = selected.filter((p) => p.brandId === commonBrandId);
    if (carried.length < selected.length) {
      const brandName = brands.find((b) => b.id === commonBrandId)?.name ?? "one brand";
      toast.info(
        `A mockup uses one brand at a time — kept ${carried.length} ${brandName} product${carried.length === 1 ? "" : "s"}.`,
      );
    }
    studioPrefill.set({
      productIds: carried.map((p) => p.id),
      brandId: commonBrandId,
      source: "products",
    });
    router.push("/");
  };

  const isFiltering =
    filters.projectId !== DEFAULT_FILTERS.projectId ||
    filters.brandId !== DEFAULT_FILTERS.brandId ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.usage !== DEFAULT_FILTERS.usage ||
    filters.status !== DEFAULT_FILTERS.status ||
    searchQuery.trim().length > 0;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title="Products"
        description="Your catalog of products to drop into generated scenes."
        actions={
          <Button onClick={openCreate}>
            <Plus />
            Add product
          </Button>
        }
      />

      <ProductFilters
        projects={projects}
        brands={brands}
        categories={categories}
        filters={filters}
        onChange={setFilters}
        search={searchQuery}
        onSearchChange={(value) => appStore.setSearchQuery(value)}
      />

      {!mounted ? (
        <LoadingGrid />
      ) : products.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No products yet"
          description="Add your first product to start composing branded visuals."
          action={
            <Button onClick={openCreate}>
              <Plus />
              Add product
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={isFiltering ? SearchX : PackageSearch}
          title={
            selectedProject
              ? "No products in this project"
              : isFiltering
                ? "No products match your filters"
                : "No products to show"
          }
          description={
            selectedProject
              ? "No products available for this project. Add games or products in Products to continue."
              : isFiltering
                ? "Try a different search term or clear the filters to see everything."
                : "There are no products in this view."
          }
          action={
            selectedProject ? (
              <Button onClick={openCreate}>
                <Plus />
                Add product
              </Button>
            ) : isFiltering ? (
              <Button
                variant="outline"
                onClick={() => {
                  setFilters(DEFAULT_FILTERS);
                  appStore.setSearchQuery("");
                }}
              >
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {filtered.length} product{filtered.length === 1 ? "" : "s"}
            {visibleSelectedIds.length > 0 && ` · ${visibleSelectedIds.length} selected`}
          </p>
          {isMobile ? (
            <div className="space-y-2">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  brand={brandsById.get(product.brandId)}
                  selected={selectedIds.includes(product.id)}
                  onToggleSelect={toggleSelect}
                  onEdit={openEdit}
                  onArchive={handleArchiveToggle}
                  onOpenInStudio={(p) => openInStudio([p.id])}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  brand={brandsById.get(product.brandId)}
                  selected={selectedIds.includes(product.id)}
                  onToggleSelect={toggleSelect}
                  onEdit={openEdit}
                  onArchive={handleArchiveToggle}
                  onOpenInStudio={(p) => openInStudio([p.id])}
                />
              ))}
            </div>
          )}
        </>
      )}

      <SelectionBar
        count={visibleSelectedIds.length}
        onClear={clearSelection}
        onOpenInStudio={() => openInStudio(visibleSelectedIds)}
      />

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editing}
        brands={brands}
        defaultBrandId={
          filters.brandId !== ALL_VALUE ? filters.brandId : activeBrand?.id ?? undefined
        }
      />

      <ConfirmDialog
        open={archiveTarget !== null}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive product?"
        description={
          archiveTarget
            ? `“${archiveTarget.name}” will be hidden from the active catalog. You can restore it any time.`
            : undefined
        }
        confirmLabel="Archive"
        onConfirm={confirmArchive}
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
            <Skeleton className="h-3 w-1/2" />
            <div className="flex gap-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
