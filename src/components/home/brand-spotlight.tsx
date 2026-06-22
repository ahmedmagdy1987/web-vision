"use client";

import Link from "next/link";
import { ArrowRight, ImageIcon, Layers, Package } from "lucide-react";
import type { Brand } from "@/lib/domain";
import { useProducts } from "@/lib/hooks";
import { AssetImage } from "@/components/common/asset-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EntityStatusBadge } from "@/components/common/status-badge";
import { brandLogoUrl } from "@/lib/brand-display";

/** Tint/shade stops used to derive a small palette from a brand accent. */
const PALETTE_STOPS: { mix: number; with: "white" | "black" }[] = [
  { mix: 80, with: "white" },
  { mix: 45, with: "white" },
  { mix: 0, with: "white" },
  { mix: 30, with: "black" },
  { mix: 55, with: "black" },
];

interface BrandSpotlightProps {
  brand: Brand;
}

export function BrandSpotlight({ brand }: BrandSpotlightProps) {
  const products = useProducts();

  const logoCount = brand.logos.filter((l) => l.status === "active").length;
  const productCount = products.filter(
    (p) => p.brandId === brand.id && p.status === "active",
  ).length;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base">Brand spotlight</CardTitle>
          <EntityStatusBadge status={brand.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="size-12 shrink-0 overflow-hidden rounded-lg border bg-card shadow-sm">
            <AssetImage
              src={brandLogoUrl(brand)}
              alt={`${brand.name} logo`}
              className="size-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="truncate font-semibold">{brand.name}</p>
            {brand.description ? (
              <p className="text-muted-foreground line-clamp-1 text-sm">{brand.description}</p>
            ) : (
              <p className="text-muted-foreground text-sm">No tagline yet</p>
            )}
          </div>
        </div>

        {/* Palette */}
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium">Accent palette</p>
          <div className="flex overflow-hidden rounded-lg border">
            {PALETTE_STOPS.map((stop, i) => (
              <div
                key={i}
                className="h-9 flex-1"
                title={`${brand.accentColor} · ${stop.mix}% ${stop.with}`}
                style={{
                  backgroundColor:
                    stop.mix === 0
                      ? brand.accentColor
                      : `color-mix(in oklab, ${brand.accentColor}, ${stop.with} ${stop.mix}%)`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Counts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <Layers className="text-brand size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tabular-nums">{logoCount}</p>
              <p className="text-muted-foreground truncate text-xs">
                {logoCount === 1 ? "Logo" : "Logos"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-3">
            <Package className="text-brand size-4 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold tabular-nums">{productCount}</p>
              <p className="text-muted-foreground truncate text-xs">
                {productCount === 1 ? "Product" : "Products"}
              </p>
            </div>
          </div>
        </div>

        {brand.instructions && (
          <Badge variant="muted" className="gap-1.5">
            <ImageIcon className="size-3" />
            Brand instructions set
          </Badge>
        )}

        <Button asChild variant="outline" className="w-full">
          <Link href="/identity">
            Manage identity
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
