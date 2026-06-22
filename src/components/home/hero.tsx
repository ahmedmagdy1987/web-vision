"use client";

import { Sparkles } from "lucide-react";
import type { Brand } from "@/lib/domain";
import { AssetImage } from "@/components/common/asset-image";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { brandLogoUrl } from "@/lib/brand-display";
import { cn } from "@/lib/utils";

interface HeroProps {
  brand: Brand | null;
  /** False until the client store has hydrated. */
  ready: boolean;
}

export function Hero({ brand, ready }: HeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-card p-6 shadow-sm sm:p-8",
        "bg-gradient-to-br from-brand-subtle via-card to-card",
      )}
    >
      {/* Decorative accent glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-24 size-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "color-mix(in oklab, var(--brand) 55%, transparent)" }}
      />
      <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl space-y-3">
          <Badge variant="brand" className="gap-1.5">
            <Sparkles className="size-3" />
            Web Vision Studio
          </Badge>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Turn your brand into on-location visuals.
          </h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Compose photoreal product placements, storefront mockups and lifestyle scenes from your
            brand identity, products and locations — in a few clicks.
          </p>
        </div>

        {ready ? (
          brand ? (
            <BrandIdentity brand={brand} />
          ) : null
        ) : (
          <div className="flex items-center gap-3 self-start rounded-xl border bg-background/60 p-3 sm:self-auto">
            <Skeleton className="size-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BrandIdentity({ brand }: { brand: Brand }) {
  return (
    <div className="flex items-center gap-3 self-start rounded-xl border border-brand-border bg-background/70 p-3 backdrop-blur-sm sm:self-auto">
      <div className="size-14 overflow-hidden rounded-lg border bg-card shadow-sm">
        <AssetImage
          src={brandLogoUrl(brand)}
          alt={`${brand.name} logo`}
          className="size-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="text-muted-foreground text-xs font-medium">Active brand</p>
        <p className="truncate text-sm font-semibold">{brand.name}</p>
        <div className="mt-1 flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-3 rounded-full border"
            style={{ backgroundColor: brand.accentColor }}
          />
          <span className="text-muted-foreground font-mono text-[11px] uppercase">
            {brand.accentColor}
          </span>
        </div>
      </div>
    </div>
  );
}
