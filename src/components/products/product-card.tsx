"use client";

import * as React from "react";
import { Archive, Images, MoreVertical, Package, Pencil, RotateCcw, Sparkles } from "lucide-react";
import type { Brand, Product } from "@/lib/domain";
import { PRODUCT_USAGE_LABELS } from "@/lib/domain";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AspectFrame } from "@/components/common/aspect-frame";
import { AssetImage } from "@/components/common/asset-image";
import { EntityStatusBadge } from "@/components/common/status-badge";

interface ProductCardProps {
  product: Product;
  brand?: Brand;
  selected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onOpenInStudio: (product: Product) => void;
  /** Compact single-row layout for mobile. */
  compact?: boolean;
}

const MAX_TAGS = 3;

export function ProductCard({
  product,
  brand,
  selected,
  onToggleSelect,
  onEdit,
  onArchive,
  onOpenInStudio,
  compact = false,
}: ProductCardProps) {
  const archived = product.status === "archived";
  const accent = brand?.accentColor ?? "var(--brand)";
  const extraTags = product.tags.length - MAX_TAGS;

  const ActionsMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for ${product.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onSelect={() => onOpenInStudio(product)}>
          <Sparkles />
          Use in mockup
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onEdit(product)}>
          <Pencil />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => onArchive(product)}>
          {archived ? (
            <>
              <RotateCcw />
              Restore
            </>
          ) : (
            <>
              <Archive />
              Archive
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const BrandLine = (
    <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
      <span className="truncate">{brand?.name ?? "Unknown brand"}</span>
    </span>
  );

  if (compact) {
    return (
      <Card
        className={cn(
          "flex-row items-center gap-3 rounded-lg p-2.5 transition-colors",
          "hover:border-brand-border",
          selected && "border-brand ring-1 ring-brand-border bg-brand-subtle/40",
          archived && "opacity-70",
        )}
        onClick={() => onToggleSelect(product.id)}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(product.id)}
          onClick={(e) => e.stopPropagation()}
          aria-label={`Select ${product.name}`}
        />
        <div className="bg-muted size-14 shrink-0 overflow-hidden rounded-md">
          <AssetImage
            src={product.mainImage?.url}
            alt={product.name}
            fallbackIcon={Package}
            className="size-full object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="truncate text-sm font-medium">{product.name}</p>
          {BrandLine}
          <div className="flex items-center gap-1.5 pt-0.5">
            <Badge variant="outline" className="text-[10px]">
              {product.category}
            </Badge>
            <Badge variant="muted" className="text-[10px]">
              {PRODUCT_USAGE_LABELS[product.usage]}
            </Badge>
          </div>
        </div>
        {ActionsMenu}
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden p-0 transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand-border",
        selected && "border-brand ring-2 ring-brand-border",
        archived && "opacity-75",
      )}
      onClick={() => onToggleSelect(product.id)}
    >
      <div className="relative">
        <AspectFrame ratio="4:3" className="bg-muted">
          <AssetImage
            src={product.mainImage?.url}
            alt={product.name}
            fallbackIcon={Package}
            fallbackLabel="No image uploaded"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </AspectFrame>

        {/* Select checkbox */}
        <div
          className={cn(
            "absolute top-2.5 left-2.5 rounded-md bg-background/80 p-1 backdrop-blur transition-opacity",
            "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            selected && "opacity-100",
          )}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(product.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Select ${product.name}`}
          />
        </div>

        {/* Status + actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          {archived && <EntityStatusBadge status={product.status} />}
          <div
            className={cn(
              "rounded-md bg-background/80 backdrop-blur transition-opacity",
              "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
            )}
          >
            {ActionsMenu}
          </div>
        </div>

        {product.referenceImages.length > 0 && (
          <div
            className="text-foreground absolute right-2 bottom-2 flex items-center gap-1 rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-medium backdrop-blur"
            title={`${product.referenceImages.length} reference image${product.referenceImages.length === 1 ? "" : "s"}`}
          >
            <Images className="size-3" />
            {product.referenceImages.length}
          </div>
        )}
      </div>

      <div className="space-y-2.5 p-4">
        <div className="space-y-1">
          <h3 className="truncate text-sm font-semibold" title={product.name}>
            {product.name}
          </h3>
          {BrandLine}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{product.category}</Badge>
          <Badge variant="muted">{PRODUCT_USAGE_LABELS[product.usage]}</Badge>
        </div>

        {product.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {product.tags.slice(0, MAX_TAGS).map((tag) => (
              <Badge key={tag} variant="brand" className="font-normal">
                {tag}
              </Badge>
            ))}
            {extraTags > 0 && (
              <span className="text-muted-foreground text-xs">+{extraTags}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
