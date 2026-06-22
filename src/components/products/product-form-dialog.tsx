"use client";

import * as React from "react";
import type { Brand, ImageAsset, Product, ProductDimensions, ProductUsage } from "@/lib/domain";
import { DIMENSION_UNITS, PRODUCT_USAGE_LABELS } from "@/lib/domain";
import { productRepository, type ProductInput } from "@/lib/repositories";
import { toast } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TagInput } from "@/components/common/tag-input";
import { ImageDropzone } from "@/components/common/image-dropzone";

const USAGE_VALUES: ProductUsage[] = ["indoor", "outdoor", "both"];

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this product, otherwise creates a new one. */
  product?: Product | null;
  brands: Brand[];
  /** Brand to preselect when creating a new product. */
  defaultBrandId?: string;
}

interface DimensionDraft {
  width: string;
  height: string;
  depth: string;
  unit: ProductDimensions["unit"];
}

const EMPTY_DIMENSIONS: DimensionDraft = { width: "", height: "", depth: "", unit: "cm" };

function dimensionsToDraft(dimensions?: ProductDimensions): DimensionDraft {
  if (!dimensions) return EMPTY_DIMENSIONS;
  return {
    width: dimensions.width != null ? String(dimensions.width) : "",
    height: dimensions.height != null ? String(dimensions.height) : "",
    depth: dimensions.depth != null ? String(dimensions.depth) : "",
    unit: dimensions.unit,
  };
}

function parseNumber(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  brands,
  defaultBrandId,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product);
  const activeBrands = React.useMemo(() => brands.filter((b) => b.status === "active"), [brands]);
  const brandOptions = React.useMemo(() => {
    // Always include the product's own brand even if archived, so editing works.
    if (product && !activeBrands.some((b) => b.id === product.brandId)) {
      const own = brands.find((b) => b.id === product.brandId);
      if (own) return [own, ...activeBrands];
    }
    return activeBrands;
  }, [activeBrands, brands, product]);

  // Form state
  const [name, setName] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]);
  const [description, setDescription] = React.useState("");
  const [dimensions, setDimensions] = React.useState<DimensionDraft>(EMPTY_DIMENSIONS);
  const [usage, setUsage] = React.useState<ProductUsage>("indoor");
  const [mainImage, setMainImage] = React.useState<ImageAsset[]>([]);
  const [referenceImages, setReferenceImages] = React.useState<ImageAsset[]>([]);
  const [preservation, setPreservation] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);

  // Reset the form when the dialog opens or switches target entity.
  // Adjust-during-render pattern (no setState-in-effect).
  const formKey = `${open ? "open" : "closed"}:${product?.id ?? "new"}:${product?.updatedAt ?? ""}`;
  const [lastKey, setLastKey] = React.useState<string | null>(null);
  if (lastKey !== formKey) {
    setLastKey(formKey);
    if (open) {
      setName(product?.name ?? "");
      setBrandId(product?.brandId ?? defaultBrandId ?? activeBrands[0]?.id ?? "");
      setCategory(product?.category ?? "");
      setTags(product?.tags ?? []);
      setDescription(product?.description ?? "");
      setDimensions(dimensionsToDraft(product?.dimensions));
      setUsage(product?.usage ?? "indoor");
      setMainImage(product?.mainImage ? [product.mainImage] : []);
      setReferenceImages(product?.referenceImages ?? []);
      setPreservation(product?.preservationInstructions ?? "");
    }
    setSubmitted(false);
  }

  const trimmedName = name.trim();
  const trimmedCategory = category.trim();
  const nameError = trimmedName.length === 0;
  const brandError = brandId.length === 0;
  const categoryError = trimmedCategory.length === 0;
  const isValid = !nameError && !brandError && !categoryError;

  const buildDimensions = (): ProductDimensions | undefined => {
    const width = parseNumber(dimensions.width);
    const height = parseNumber(dimensions.height);
    const depth = parseNumber(dimensions.depth);
    if (width == null && height == null && depth == null) return undefined;
    return { width, height, depth, unit: dimensions.unit };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (!isValid) {
      toast.error("Please fill in the required fields.");
      return;
    }

    const input: ProductInput = {
      brandId,
      name: trimmedName,
      category: trimmedCategory,
      tags,
      description: description.trim() || undefined,
      dimensions: buildDimensions(),
      usage,
      mainImage: mainImage[0],
      referenceImages,
      preservationInstructions: preservation.trim() || undefined,
    };

    if (product) {
      productRepository.updateProduct(product.id, input);
      toast.success(`Updated “${trimmedName}”.`);
    } else {
      productRepository.addProduct(input);
      toast.success(`Added “${trimmedName}”.`);
    }
    onOpenChange(false);
  };

  const noBrands = activeBrands.length === 0 && !product;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the product details, imagery and preservation rules."
              : "Capture a product so it can be placed into generated scenes."}
          </DialogDescription>
        </DialogHeader>

        {noBrands ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            Create a brand first — every product belongs to a brand.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Aurora Lounge Chair"
                  aria-invalid={submitted && nameError}
                  autoFocus
                />
                {submitted && nameError && <p className="text-destructive text-xs">Name is required.</p>}
              </div>

              {/* Brand */}
              <div className="space-y-1.5">
                <Label htmlFor="product-brand">
                  Brand <span className="text-destructive">*</span>
                </Label>
                <Select value={brandId} onValueChange={setBrandId}>
                  <SelectTrigger id="product-brand" aria-invalid={submitted && brandError}>
                    <SelectValue placeholder="Select a brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brandOptions.map((brand) => (
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
                {submitted && brandError && <p className="text-destructive text-xs">Brand is required.</p>}
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <Label htmlFor="product-category">
                  Category <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="product-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Seating"
                  aria-invalid={submitted && categoryError}
                />
                {submitted && categoryError && (
                  <p className="text-destructive text-xs">Category is required.</p>
                )}
              </div>

              {/* Usage */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Usage</Label>
                <ToggleGroup
                  type="single"
                  value={usage}
                  onValueChange={(value) => {
                    if (value) setUsage(value as ProductUsage);
                  }}
                  className="w-full justify-start"
                >
                  {USAGE_VALUES.map((value) => (
                    <ToggleGroupItem key={value} value={value} aria-label={PRODUCT_USAGE_LABELS[value]}>
                      {PRODUCT_USAGE_LABELS[value]}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>

              {/* Tags */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-tags">Tags</Label>
                <TagInput id="product-tags" value={tags} onChange={setTags} />
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-description">Description</Label>
                <Textarea
                  id="product-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Materials, finish, notable details…"
                  rows={3}
                />
              </div>

              {/* Dimensions */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dimensions</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor="dim-width" className="text-muted-foreground text-xs font-normal">
                      Width
                    </Label>
                    <Input
                      id="dim-width"
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={dimensions.width}
                      onChange={(e) => setDimensions((d) => ({ ...d, width: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dim-height" className="text-muted-foreground text-xs font-normal">
                      Height
                    </Label>
                    <Input
                      id="dim-height"
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={dimensions.height}
                      onChange={(e) => setDimensions((d) => ({ ...d, height: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dim-depth" className="text-muted-foreground text-xs font-normal">
                      Depth
                    </Label>
                    <Input
                      id="dim-depth"
                      type="number"
                      min={0}
                      inputMode="decimal"
                      value={dimensions.depth}
                      onChange={(e) => setDimensions((d) => ({ ...d, depth: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dim-unit" className="text-muted-foreground text-xs font-normal">
                      Unit
                    </Label>
                    <Select
                      value={dimensions.unit}
                      onValueChange={(value) =>
                        setDimensions((d) => ({ ...d, unit: value as ProductDimensions["unit"] }))
                      }
                    >
                      <SelectTrigger id="dim-unit">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DIMENSION_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Main image */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Main image</Label>
                <ImageDropzone
                  value={mainImage}
                  onChange={setMainImage}
                  multiple={false}
                  label="Drop the hero product image"
                  hint="One clean, well-lit shot · PNG, JPG, WEBP, SVG"
                />
              </div>

              {/* Reference images */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Reference images</Label>
                <ImageDropzone
                  value={referenceImages}
                  onChange={setReferenceImages}
                  multiple
                  label="Drop additional angles & details"
                  hint="Optional · multiple images supported"
                />
              </div>

              {/* Preservation */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="product-preservation">Preservation instructions</Label>
                <Textarea
                  id="product-preservation"
                  value={preservation}
                  onChange={(e) => setPreservation(e.target.value)}
                  placeholder="What must stay exact in generated images (color, logo, proportions)…"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitted && !isValid}>
                {isEdit ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
