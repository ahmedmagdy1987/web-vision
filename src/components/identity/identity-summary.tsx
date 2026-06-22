"use client";

import { CheckCircle2, ImageIcon, MapPin, Package, Pencil, Settings2, Sparkles, Star, TriangleAlert } from "lucide-react";
import type { Brand } from "@/lib/domain";
import { LOGO_KIND_LABELS } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandPalette } from "./brand-palette";

interface IdentitySummaryProps {
  brand: Brand;
  productCount: number;
  locationCount: number;
  onEdit: (brand: Brand) => void;
  onManage: (brand: Brand) => void;
}

export function IdentitySummary({ brand, productCount, locationCount, onEdit, onManage }: IdentitySummaryProps) {
  const activeLogos = brand.logos.filter((l) => l.status === "active");
  const warnings: string[] = [];
  if (activeLogos.length === 0) warnings.push("No active logos uploaded");
  if (!brand.defaultLogoId) warnings.push("No default generation logo set");
  if (productCount === 0) warnings.push("No products yet for this brand");
  if (!brand.instructions) warnings.push("No brand generation instructions");

  return (
    <Card className="border-brand/30">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Current brand identity</CardTitle>
            <Badge variant="brand">
              <CheckCircle2 className="size-3" />
              {brand.name}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onEdit(brand)}>
              <Pencil className="size-4" />
              Edit
            </Button>
            <Button size="sm" onClick={() => onManage(brand)}>
              <Settings2 className="size-4" />
              Manage identity
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 lg:grid-cols-2">
        {/* Logos */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <ImageIcon className="text-muted-foreground size-4" />
            Logo variants
          </h3>
          {activeLogos.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
              No logos yet — open Manage identity to upload.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {activeLogos.map((logo) => {
                const isDefault = logo.id === brand.defaultLogoId;
                return (
                  <li
                    key={logo.id}
                    className="border-border bg-card relative flex w-20 flex-col items-center gap-1 rounded-lg border p-2"
                  >
                    <span className="bg-muted flex size-12 items-center justify-center overflow-hidden rounded-md">
                      <AssetImage src={logo.asset.url} alt={`${LOGO_KIND_LABELS[logo.kind]} logo`} className="size-full object-contain p-1" />
                    </span>
                    <span className="text-[10px] font-medium">{LOGO_KIND_LABELS[logo.kind]}</span>
                    {isDefault && (
                      <span
                        className="bg-brand text-brand-foreground absolute -right-1.5 -top-1.5 rounded-full p-0.5"
                        title="Default generation logo"
                      >
                        <Star className="size-3 fill-current" />
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="text-muted-foreground text-xs">
            <Star className="mr-1 inline size-3 fill-current align-[-1px]" />
            marks the default generation logo.
          </p>
        </div>

        {/* Palette + stats */}
        <div className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Accent palette</h3>
            <BrandPalette accent={brand.accentColor} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/40 flex items-center gap-2 rounded-lg border p-3">
              <Package className="text-brand size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular-nums">{productCount}</p>
                <p className="text-muted-foreground truncate text-xs">{productCount === 1 ? "Product" : "Products"}</p>
              </div>
            </div>
            <div className="bg-muted/40 flex items-center gap-2 rounded-lg border p-3">
              <MapPin className="text-brand size-4 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold tabular-nums">{locationCount}</p>
                <p className="text-muted-foreground truncate text-xs">{locationCount === 1 ? "Location" : "Locations"}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <Sparkles className="text-brand size-4" />
            Generation instructions:{" "}
            {brand.instructions ? (
              <Badge variant="success">Set</Badge>
            ) : (
              <Badge variant="muted">Not set</Badge>
            )}
          </div>
        </div>

        {/* Readiness warnings */}
        {warnings.length > 0 && (
          <div className="lg:col-span-2">
            <div className="border-warning/40 bg-warning/10 space-y-1.5 rounded-lg border p-3">
              <p className="text-warning flex items-center gap-1.5 text-xs font-semibold">
                <TriangleAlert className="size-3.5" />
                Setup to complete
              </p>
              <ul className="text-muted-foreground list-inside list-disc text-xs">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
