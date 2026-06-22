"use client";

import * as React from "react";
import {
  ArchiveRestore,
  ArchiveX,
  ImageIcon,
  Package,
  Pencil,
  Sparkles,
} from "lucide-react";
import type { Brand } from "@/lib/domain";
import { brandRepository } from "@/lib/repositories";
import { appStore, useProducts } from "@/lib/hooks";
import { brandLogoUrl } from "@/lib/brand-display";
import { readableForeground } from "@/lib/theme/brand-accent";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetImage } from "@/components/common/asset-image";
import { EmptyState } from "@/components/common/empty-state";
import { EntityStatusBadge } from "@/components/common/status-badge";
import { BrandPalette } from "./brand-palette";
import { LogoCard } from "./logo-card";
import { LogoUploader } from "./logo-uploader";

interface BrandManagerSheetProps {
  brand: Brand | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (brand: Brand) => void;
}

export function BrandManagerSheet({ brand, open, onOpenChange, onEdit }: BrandManagerSheetProps) {
  const products = useProducts();

  if (!brand) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full max-w-xl">
          <SheetHeader>
            <SheetTitle>Brand</SheetTitle>
            <SheetDescription>No brand selected.</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const accent = brand.accentColor;
  const archived = brand.status === "archived";
  const productCount = products.filter((p) => p.brandId === brand.id).length;

  const activeLogos = brand.logos.filter((l) => l.status === "active");
  const archivedLogos = brand.logos.filter((l) => l.status === "archived");
  const markUrl = brandLogoUrl(brand);

  const handleToggleStatus = () => {
    const next = archived ? "active" : "archived";
    brandRepository.setStatus(brand.id, next);
    // If we just archived the globally selected brand, relocate the selection
    // so the app never stays bound to an archived brand.
    if (next === "archived" && appStore.getSnapshot().selectedBrandId === brand.id) {
      const nextActive = brandRepository.list().find((b) => b.status === "active" && b.id !== brand.id);
      appStore.setSelectedBrand(nextActive?.id ?? null);
    }
    toast.success(`“${brand.name}” ${next === "active" ? "activated" : "archived"}.`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-xl gap-0 p-0">
        <SheetHeader className="border-b p-6 pr-12">
          <div className="flex items-start gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border shadow-sm"
              style={{ backgroundColor: accent }}
            >
              <AssetImage
                src={markUrl}
                alt={`${brand.name} logo`}
                className="size-full object-contain p-1.5"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <SheetTitle className="truncate text-xl">{brand.name}</SheetTitle>
              {brand.description ? (
                <SheetDescription className="line-clamp-2">{brand.description}</SheetDescription>
              ) : (
                <SheetDescription>No description yet.</SheetDescription>
              )}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <EntityStatusBadge status={brand.status} />
                <Badge variant="outline" className="gap-1">
                  <ImageIcon className="size-3" />
                  {brand.logos.length} {brand.logos.length === 1 ? "logo" : "logos"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <Package className="size-3" />
                  {productCount} {productCount === 1 ? "product" : "products"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button size="sm" variant="outline" onClick={() => onEdit(brand)}>
              <Pencil />
              Edit brand
            </Button>
            <Button size="sm" variant={archived ? "default" : "outline"} onClick={handleToggleStatus}>
              {archived ? <ArchiveRestore /> : <ArchiveX />}
              {archived ? "Activate" : "Archive"}
            </Button>
          </div>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-8 p-6">
            <Tabs defaultValue="logos">
              <TabsList className="w-full">
                <TabsTrigger value="logos">Logos</TabsTrigger>
                <TabsTrigger value="identity">Identity</TabsTrigger>
              </TabsList>

              <TabsContent value="logos" className="space-y-6">
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Logos</h3>
                    {activeLogos.length > 0 && (
                      <span className="text-muted-foreground text-xs">
                        {activeLogos.length} active
                      </span>
                    )}
                  </div>

                  {brand.logos.length === 0 ? (
                    <EmptyState
                      icon={ImageIcon}
                      title="No logos yet"
                      description="Upload the first logo for this brand below."
                    />
                  ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {activeLogos.map((logo) => (
                        <LogoCard
                          key={logo.id}
                          logo={logo}
                          brandId={brand.id}
                          isDefault={logo.id === brand.defaultLogoId}
                        />
                      ))}
                    </ul>
                  )}
                </section>

                {archivedLogos.length > 0 && (
                  <section className="space-y-3">
                    <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                      Archived ({archivedLogos.length})
                    </h3>
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {archivedLogos.map((logo) => (
                        <LogoCard
                          key={logo.id}
                          logo={logo}
                          brandId={brand.id}
                          isDefault={logo.id === brand.defaultLogoId}
                        />
                      ))}
                    </ul>
                  </section>
                )}

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Add a logo</h3>
                  <LogoUploader brandId={brand.id} />
                </section>
              </TabsContent>

              <TabsContent value="identity" className="space-y-6">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold">Color palette</h3>
                  <BrandPalette accent={accent} />
                </section>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Accent</h3>
                  <div className="flex items-center gap-3 rounded-lg border p-3">
                    <span
                      className="size-9 shrink-0 rounded-md border shadow-sm"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="font-mono text-sm uppercase">{accent}</p>
                      <p className="text-muted-foreground text-xs">
                        Foreground{" "}
                        <span className="font-mono uppercase">{readableForeground(accent)}</span>
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                    <Sparkles className="text-brand size-4" />
                    Generation instructions
                  </h3>
                  {brand.instructions ? (
                    <p className="text-muted-foreground rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed whitespace-pre-wrap">
                      {brand.instructions}
                    </p>
                  ) : (
                    <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-sm">
                      No brand-level instructions set. Edit the brand to add identity rules applied
                      to every generation.
                    </p>
                  )}
                </section>
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
