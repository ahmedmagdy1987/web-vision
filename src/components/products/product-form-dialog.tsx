"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
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
import { ImageDropzone } from "@/components/common/image-dropzone";
import { cn } from "@/lib/utils";

const USAGE_VALUES: ProductUsage[] = ["indoor", "outdoor", "both"];

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided the dialog edits this product, otherwise creates a new one. */
  product?: Product | null;
  brands: Brand[];
  /** Logo/brand to assign internally when creating a new product. */
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

/**
 * Radically simplified product capture. The primary flow is only Name + Main
 * image (both required) and optional reference images. Everything else
 * (category, usage, dimensions, description, preservation) lives in a collapsed
 * "Advanced details" section. The owning logo/brand is assigned internally and is
 * never shown — the employee does not pick a logo when uploading a product.
 */
export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  brands,
  defaultBrandId,
}: ProductFormDialogProps) {
  const isEdit = Boolean(product);
  const activeBrands = React.useMemo(() => brands.filter((b) => b.status === "active"), [brands]);

  // Internal (hidden) logo/brand assignment.
  const resolvedBrandId = product?.brandId ?? defaultBrandId ?? activeBrands[0]?.id ?? "";

  // Form state
  const [name, setName] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [tags, setTags] = React.useState<string[]>([]); // preserved on edit; not shown
  const [description, setDescription] = React.useState("");
  const [dimensions, setDimensions] = React.useState<DimensionDraft>(EMPTY_DIMENSIONS);
  const [usage, setUsage] = React.useState<ProductUsage>("indoor");
  const [mainImage, setMainImage] = React.useState<ImageAsset[]>([]);
  const [referenceImages, setReferenceImages] = React.useState<ImageAsset[]>([]);
  const [preservation, setPreservation] = React.useState("");
  const [submitted, setSubmitted] = React.useState(false);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  // Reset the form when the dialog opens or switches target entity.
  const formKey = `${open ? "open" : "closed"}:${product?.id ?? "new"}:${product?.updatedAt ?? ""}`;
  const [lastKey, setLastKey] = React.useState<string | null>(null);
  if (lastKey !== formKey) {
    setLastKey(formKey);
    if (open) {
      setName(product?.name ?? "");
      setCategory(product?.category ?? "");
      setTags(product?.tags ?? []);
      setDescription(product?.description ?? "");
      setDimensions(dimensionsToDraft(product?.dimensions));
      setUsage(product?.usage ?? "indoor");
      setMainImage(product?.mainImage ? [product.mainImage] : []);
      setReferenceImages(product?.referenceImages ?? []);
      setPreservation(product?.preservationInstructions ?? "");
      setAdvancedOpen(false);
    }
    setSubmitted(false);
  }

  const trimmedName = name.trim();
  const nameError = trimmedName.length === 0;
  const mainImageError = mainImage.length === 0;
  const noBrands = activeBrands.length === 0 && !product;
  const isValid = !nameError && !mainImageError && resolvedBrandId.length > 0;

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
      toast.error(mainImageError ? "Add a main product image." : "Enter a product name.");
      return;
    }

    const input: ProductInput = {
      brandId: resolvedBrandId,
      name: trimmedName,
      category: category.trim() || "Uncategorized",
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0 sm:max-w-lg sm:max-h-[92dvh]",
          // Full-screen sheet on small mobile screens.
          "max-sm:inset-0 max-sm:h-dvh max-sm:max-h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0",
        )}
      >
        <DialogHeader className="border-b px-5 py-4">
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the product name and imagery."
              : "Add a product image so it can be placed into generated scenes."}
          </DialogDescription>
        </DialogHeader>

        {noBrands ? (
          <div className="px-5 py-8">
            <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
              Add a logo first — products are stored under your Malahi library.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {/* Name (required) */}
              <div className="space-y-1.5">
                <Label htmlFor="product-name">
                  Product name <span className="text-destructive">*</span>
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

              {/* Main image (required, near the top) */}
              <div className="space-y-1.5">
                <Label>
                  Main product image <span className="text-destructive">*</span>
                </Label>
                <ImageDropzone
                  value={mainImage}
                  onChange={setMainImage}
                  multiple={false}
                  label="Drop the main product image"
                  hint="One clean, well-lit shot · PNG, JPG, WEBP"
                />
                {submitted && mainImageError && (
                  <p className="text-destructive text-xs">A main product image is required.</p>
                )}
              </div>

              {/* Additional references (optional) */}
              <div className="space-y-1.5">
                <Label>
                  Additional reference images{" "}
                  <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                </Label>
                <ImageDropzone
                  value={referenceImages}
                  onChange={setReferenceImages}
                  multiple
                  label="Drop additional angles & details"
                  hint="Optional · multiple images supported"
                />
              </div>

              {/* Advanced details — optional (collapsed) */}
              <div className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => setAdvancedOpen((o) => !o)}
                  aria-expanded={advancedOpen}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  Advanced details — optional
                  <ChevronDown
                    className={cn("text-muted-foreground size-4 shrink-0 transition-transform", advancedOpen && "rotate-180")}
                  />
                </button>
                {advancedOpen && (
                  <div className="space-y-4 border-t px-3 py-4">
                    {/* Category */}
                    <div className="space-y-1.5">
                      <Label htmlFor="product-category">Category</Label>
                      <Input
                        id="product-category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        placeholder="e.g. Seating"
                      />
                    </div>

                    {/* Usage */}
                    <div className="space-y-1.5">
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

                    {/* Dimensions */}
                    <div className="space-y-1.5">
                      <Label>Dimensions</Label>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {(["width", "height", "depth"] as const).map((dim) => (
                          <div key={dim} className="space-y-1">
                            <Label htmlFor={`dim-${dim}`} className="text-muted-foreground text-xs font-normal capitalize">
                              {dim}
                            </Label>
                            <Input
                              id={`dim-${dim}`}
                              type="number"
                              min={0}
                              inputMode="decimal"
                              value={dimensions[dim]}
                              onChange={(e) => setDimensions((d) => ({ ...d, [dim]: e.target.value }))}
                              placeholder="0"
                            />
                          </div>
                        ))}
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

                    {/* Description */}
                    <div className="space-y-1.5">
                      <Label htmlFor="product-description">Description</Label>
                      <Textarea
                        id="product-description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Materials, finish, notable details…"
                        rows={3}
                      />
                    </div>

                    {/* Preservation notes */}
                    <div className="space-y-1.5">
                      <Label htmlFor="product-preservation">Preservation notes</Label>
                      <Textarea
                        id="product-preservation"
                        value={preservation}
                        onChange={(e) => setPreservation(e.target.value)}
                        placeholder="What must stay exact in generated images (color, logo, proportions)…"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="bg-background border-t px-5 py-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{isEdit ? "Save changes" : "Save product"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
