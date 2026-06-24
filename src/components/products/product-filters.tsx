"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { Brand, EntityStatus, ProductUsage, Project } from "@/lib/domain";
import { PRODUCT_USAGE_LABELS } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { SearchInput } from "@/components/common/search-input";

export const ALL_VALUE = "__all__";

export type StatusFilter = EntityStatus | "all";
export type UsageFilter = ProductUsage | "all";

export interface ProductFilterState {
  projectId: string;
  brandId: string;
  category: string;
  usage: UsageFilter;
  status: StatusFilter;
}

export const DEFAULT_FILTERS: ProductFilterState = {
  projectId: ALL_VALUE,
  brandId: ALL_VALUE,
  category: ALL_VALUE,
  usage: "all",
  status: "active",
};

interface ProductFiltersProps {
  projects: Project[];
  brands: Brand[];
  categories: string[];
  filters: ProductFilterState;
  onChange: (filters: ProductFilterState) => void;
  search: string;
  onSearchChange: (value: string) => void;
}

const USAGE_VALUES: ProductUsage[] = ["indoor", "outdoor", "both"];

export function ProductFilters({
  brands,
  categories,
  filters,
  onChange,
  search,
  onSearchChange,
}: ProductFiltersProps) {
  const patch = (next: Partial<ProductFilterState>) => onChange({ ...filters, ...next });

  const hasActiveFilters =
    filters.projectId !== DEFAULT_FILTERS.projectId ||
    filters.brandId !== DEFAULT_FILTERS.brandId ||
    filters.category !== DEFAULT_FILTERS.category ||
    filters.usage !== DEFAULT_FILTERS.usage ||
    filters.status !== DEFAULT_FILTERS.status ||
    search.trim().length > 0;

  const clearAll = () => {
    onChange(DEFAULT_FILTERS);
    onSearchChange("");
  };

  return (
    <div className="space-y-3">
      {/* Mobile / inline search mirrors the global query */}
      <SearchInput
        value={search}
        onValueChange={onSearchChange}
        placeholder="Search products by name, tag, category…"
        aria-label="Search products"
      />

      <div className="flex flex-wrap items-end gap-3">
        {/* Brand */}
        <div className="min-w-40 flex-1 space-y-1.5 sm:flex-none">
          <Label htmlFor="filter-brand" className="text-muted-foreground text-xs">
            Brand
          </Label>
          <Select value={filters.brandId} onValueChange={(value) => patch({ brandId: value })}>
            <SelectTrigger id="filter-brand" className="sm:w-44">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All brands</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand.id} value={brand.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: brand.accentColor }}
                    />
                    {brand.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category */}
        <div className="min-w-40 flex-1 space-y-1.5 sm:flex-none">
          <Label htmlFor="filter-category" className="text-muted-foreground text-xs">
            Category
          </Label>
          <Select value={filters.category} onValueChange={(value) => patch({ category: value })}>
            <SelectTrigger id="filter-category" className="sm:w-44">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status */}
        <div className="min-w-32 space-y-1.5">
          <Label htmlFor="filter-status" className="text-muted-foreground text-xs">
            Status
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => patch({ status: value as StatusFilter })}
          >
            <SelectTrigger id="filter-status" className="sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="all">All statuses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Usage */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground text-xs">Usage</Label>
          <ToggleGroup
            type="single"
            value={filters.usage}
            onValueChange={(value) => patch({ usage: (value || "all") as UsageFilter })}
          >
            <ToggleGroupItem value="all" aria-label="Any usage">
              Any
            </ToggleGroupItem>
            {USAGE_VALUES.map((value) => (
              <ToggleGroupItem key={value} value={value} aria-label={PRODUCT_USAGE_LABELS[value]}>
                {value === "both" ? "Both" : PRODUCT_USAGE_LABELS[value]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-muted-foreground">
            <X />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
