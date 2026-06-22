"use client";

import * as React from "react";
import { ImageIcon, Package, Settings2 } from "lucide-react";
import type { Brand } from "@/lib/domain";
import { brandLogoUrl } from "@/lib/brand-display";
import { useProducts } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AssetImage } from "@/components/common/asset-image";
import { EntityStatusBadge } from "@/components/common/status-badge";

interface BrandCardProps {
  brand: Brand;
  onManage: (brand: Brand) => void;
}

export function BrandCard({ brand, onManage }: BrandCardProps) {
  const products = useProducts();
  const productCount = products.filter((p) => p.brandId === brand.id).length;
  const archived = brand.status === "archived";

  const markUrl = brandLogoUrl(brand);

  const open = () => onManage(brand);

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Manage ${brand.name}`}
      onClick={open}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      }}
      className={cn(
        "group relative cursor-pointer gap-0 overflow-hidden p-0 transition-all outline-none",
        "hover:border-brand-border hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring/50",
        archived && "opacity-70",
      )}
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: brand.accentColor }}
        aria-hidden
      />
      <CardContent className="flex items-start gap-4 p-5">
        <div
          className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm transition-transform group-hover:scale-105"
          style={{ backgroundColor: brand.accentColor }}
        >
          <AssetImage
            src={markUrl}
            alt={`${brand.name} logo`}
            className="size-full object-contain p-1.5"
          />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate font-semibold leading-tight">{brand.name}</h3>
            <EntityStatusBadge status={brand.status} />
          </div>
          <p className="text-muted-foreground line-clamp-2 min-h-[2.5rem] text-sm">
            {brand.description || "No description yet."}
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex items-center justify-between gap-3 border-t bg-muted/20 px-5 py-3">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span
              className="size-3.5 shrink-0 rounded-full border shadow-sm"
              style={{ backgroundColor: brand.accentColor }}
              aria-hidden
            />
            <span className="font-mono uppercase text-muted-foreground">{brand.accentColor}</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground flex items-center gap-1 text-xs" title={`${brand.logos.length} logos`}>
            <ImageIcon className="size-3.5" />
            {brand.logos.length}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-xs" title={`${productCount} products`}>
            <Package className="size-3.5" />
            {productCount}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              open();
            }}
          >
            <Settings2 />
            Manage
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
