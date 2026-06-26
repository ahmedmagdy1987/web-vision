"use client";

import * as React from "react";
import { Archive, Images, MoreVertical, Package, Pencil, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import type { Brand, Product } from "@/lib/domain";
import { PRODUCT_USAGE_LABELS } from "@/lib/domain";
import { useResults } from "@/lib/hooks";
import { productRepository } from "@/lib/repositories";
import { countProductReferences } from "@/lib/services/asset-references";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/sonner";
import { DeleteAssetDialog } from "@/components/common/delete-asset-dialog";
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
import { ImageLightbox } from "@/components/common/image-lightbox";
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

  const images = React.useMemo(
    () =>
      [product.mainImage, ...product.referenceImages]
        .filter((img): img is NonNullable<typeof img> => Boolean(img?.url))
        .map((img) => ({ url: img.url, alt: product.name })),
    [product.mainImage, product.referenceImages, product.name],
  );
  const [lightboxOpen, setLightboxOpen] = React.useState(false);
  const [lightboxIndex, setLightboxIndex] = React.useState(0);
  // Opening the image preview must never select the card (stop the card click).
  const openLightbox = React.useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (images.length > 0) {
        setLightboxIndex(0);
        setLightboxOpen(true);
      }
    },
    [images.length],
  );
  const results = useResults();
  const referenceCount = countProductReferences(results, product.id);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const overlays = (
    <>
      <ImageLightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={images}
        index={lightboxIndex}
        onIndexChange={setLightboxIndex}
      />
      <DeleteAssetDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        assetType="Product"
        name={product.name}
        thumbnailUrl={product.mainImage?.url}
        referenceCount={referenceCount}
        onArchive={() => {
          productRepository.setStatus(product.id, "archived");
          toast.success(`${product.name} removed from active library`);
        }}
        onDelete={async () => {
          await productRepository.deleteProduct(product.id);
          toast.success(`${product.name} deleted`);
        }}
      />
    </>
  );

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
        <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
          <Trash2 />
          Delete
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
      <>
      <Card
        className={cn(
          "flex-row items-center gap-3 rounded-lg p-2.5 transition-colors",
          "hover:border-brand-border",
          selected && "border-brand ring-1 ring-brand-border bg-brand-subtle/40",
          archived && "opacity-70",
        )}
      >
        <Checkbox
          checked={selected}
          onCheckedChange={() => onToggleSelect(product.id)}
          aria-label={`Select ${product.name}`}
        />
        <button
          type="button"
          onClick={openLightbox}
          aria-label={`View ${product.name} image`}
          className="bg-muted size-14 shrink-0 cursor-zoom-in overflow-hidden rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <AssetImage
            src={product.mainImage?.url}
            alt={product.name}
            fallbackIcon={Package}
            className="size-full object-cover"
          />
        </button>
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
      {overlays}
      </>
    );
  }

  return (
    <>
    <Card
      className={cn(
        "group relative gap-0 overflow-hidden p-0 transition-all",
        "hover:-translate-y-0.5 hover:shadow-md hover:border-brand-border",
        selected && "border-brand ring-2 ring-brand-border",
        archived && "opacity-75",
      )}
    >
      <div className="relative">
        <button
          type="button"
          onClick={openLightbox}
          aria-label={`View ${product.name} image`}
          className="block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/50"
        >
          <AspectFrame ratio="1:1" className="bg-muted">
            <AssetImage
              src={product.mainImage?.url}
              alt={product.name}
              fallbackIcon={Package}
              fallbackLabel="No image uploaded"
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </AspectFrame>
        </button>

        {/* Select checkbox — always visible (selection is checkbox-only). */}
        <div className="absolute top-2.5 left-2.5 rounded-md bg-background/80 p-1 backdrop-blur">
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggleSelect(product.id)}
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
    {overlays}
    </>
  );
}
