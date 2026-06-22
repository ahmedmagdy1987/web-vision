"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, MapPin, Wand2 } from "lucide-react";
import type { AspectRatio, Brand, VisualizationType } from "@/lib/domain";
import {
  ASPECT_RATIO_OPTIONS,
  DEFAULT_GENERATION_SETTINGS,
  VISUALIZATION_TYPE_OPTIONS,
} from "@/lib/domain";
import { useBrands, useLocations, useProducts } from "@/lib/hooks";
import { studioPrefill } from "@/lib/store/studio-draft";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

const NONE = "__none__";

interface QuickStartCardProps {
  brand: Brand | null;
}

export function QuickStartCard({ brand }: QuickStartCardProps) {
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const router = useRouter();

  const activeBrands = brands.filter((b) => b.status === "active");

  const [brandId, setBrandId] = useState<string | null>(null);
  const effectiveBrandId = brandId ?? brand?.id ?? activeBrands[0]?.id ?? null;

  const brandProducts = products.filter((p) => p.brandId === effectiveBrandId && p.status === "active");
  const [productId, setProductId] = useState<string>(NONE);
  const effectiveProductId = brandProducts.some((p) => p.id === productId) ? productId : NONE;

  const [locationId, setLocationId] = useState<string>(NONE);
  const savedLocations = locations.filter((l) => l.saved);

  const [visualizationType, setVisualizationType] = useState<VisualizationType>(
    DEFAULT_GENERATION_SETTINGS.visualizationType,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(DEFAULT_GENERATION_SETTINGS.aspectRatio);

  function continueInStudio() {
    studioPrefill.set({
      brandId: effectiveBrandId ?? undefined,
      productIds: effectiveProductId === NONE ? undefined : [effectiveProductId],
      locationId: locationId === NONE ? undefined : locationId,
      settings: { visualizationType, aspectRatio },
      source: "home-quick-start",
    });
    router.push("/studio");
  }

  return (
    <Card className="overflow-hidden border-brand-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="bg-brand-subtle text-brand flex size-8 items-center justify-center rounded-md">
            <Wand2 className="size-4" />
          </span>
          <div>
            <CardTitle className="text-base">Quick create</CardTitle>
            <CardDescription>Set the essentials and continue into Studio.</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Brand */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-brand">Brand</Label>
            <Select value={effectiveBrandId ?? undefined} onValueChange={setBrandId}>
              <SelectTrigger id="qs-brand" aria-label="Brand">
                <SelectValue placeholder="Choose a brand" />
              </SelectTrigger>
              <SelectContent>
                {activeBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <span className="size-3 rounded-full" style={{ backgroundColor: b.accentColor }} />
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Product */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-product">Product</Label>
            <Select value={effectiveProductId} onValueChange={setProductId}>
              <SelectTrigger id="qs-product" aria-label="Product">
                <SelectValue placeholder="Choose a product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-muted-foreground">Pick in Studio</span>
                </SelectItem>
                {brandProducts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-location">Location</Label>
            <Select value={locationId} onValueChange={setLocationId}>
              <SelectTrigger id="qs-location" aria-label="Location">
                <SelectValue placeholder="Choose a location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>
                  <span className="text-muted-foreground">Pick in Studio</span>
                </SelectItem>
                {savedLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    <MapPin className="size-3.5 opacity-60" />
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Visualization type */}
          <div className="space-y-1.5">
            <Label htmlFor="qs-viz">Visualization type</Label>
            <Select value={visualizationType} onValueChange={(v) => setVisualizationType(v as VisualizationType)}>
              <SelectTrigger id="qs-viz" aria-label="Visualization type">
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {VISUALIZATION_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Aspect ratio */}
        <div className="space-y-1.5">
          <Label>Aspect ratio</Label>
          <ToggleGroup
            type="single"
            value={aspectRatio}
            onValueChange={(v) => {
              if (v) setAspectRatio(v as AspectRatio);
            }}
            className="flex w-full flex-wrap"
            aria-label="Aspect ratio"
          >
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                aria-label={`${option.label} ${option.description ?? ""}`.trim()}
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <Button onClick={continueInStudio} size="lg" className="w-full">
          Continue in Studio
          <ArrowRight className="size-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
