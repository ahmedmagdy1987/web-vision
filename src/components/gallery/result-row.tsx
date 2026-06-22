"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Package2, Star } from "lucide-react";
import type { GenerationResult } from "@/lib/domain";
import { CONTROL_LABELS, creativityLabel } from "@/lib/domain";
import { resultRepository } from "@/lib/repositories";
import { readableForeground } from "@/lib/theme/brand-accent";
import { AssetImage } from "@/components/common/asset-image";
import { ReviewBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface ResultRowProps {
  result: GenerationResult;
}

function summarizeNames(names: string[]): string {
  if (names.length === 0) return "No products";
  return names.join(", ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function ResultRow({ result }: ResultRowProps) {
  const { snapshot } = result;

  const handleToggleFavorite = React.useCallback(() => {
    const next = resultRepository.toggleFavorite(result.id);
    toast.success(next?.favorite ? "Added to favorites" : "Removed from favorites");
  }, [result.id]);

  return (
    <div
      className={cn(
        "group bg-card text-card-foreground relative flex items-center gap-3 rounded-xl border p-2.5 shadow-sm transition-all sm:gap-4",
        "hover:border-brand-border hover:shadow-md focus-within:ring-2 focus-within:ring-ring/50",
      )}
    >
      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-lg sm:size-20">
        <AssetImage
          src={result.image.url}
          alt={`${snapshot.brandName} mockup`}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: snapshot.brandAccent, color: readableForeground(snapshot.brandAccent) }}
            aria-hidden
          >
            {snapshot.brandName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold">{snapshot.brandName}</span>
          <span className="hidden sm:inline">
            <ReviewBadge review={result.review} />
          </span>
        </div>

        <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span className="flex min-w-0 items-center gap-1.5">
            <Package2 className="size-3.5 shrink-0" />
            <span className="truncate">{summarizeNames(snapshot.productNames)}</span>
          </span>
          {snapshot.locationName && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{snapshot.locationName}</span>
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5 shrink-0" />
            {formatDate(result.createdAt)}
          </span>
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
          <span className="sm:hidden">
            <ReviewBadge review={result.review} />
          </span>
          <Badge variant="muted" className="font-normal">
            {CONTROL_LABELS.visualizationType[snapshot.settings.visualizationType]}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {snapshot.settings.aspectRatio}
          </Badge>
          <Badge variant="outline" className="hidden font-normal sm:inline-flex">
            {creativityLabel(snapshot.settings.creativity)}
          </Badge>
        </div>
      </div>

      <button
        type="button"
        onClick={handleToggleFavorite}
        aria-label={result.favorite ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={result.favorite}
        className={cn(
          "relative z-20 flex size-9 shrink-0 items-center justify-center rounded-full transition-colors outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring/70",
          result.favorite
            ? "text-warning hover:bg-warning/10"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Star className={cn("size-4", result.favorite && "fill-current")} />
      </button>

      {/* Stretched link makes the whole row a single accessible navigation target. */}
      <Link
        href={`/gallery/${result.id}`}
        aria-label={`Open ${snapshot.brandName} mockup`}
        className="absolute inset-0 z-10 rounded-xl outline-none"
      />
    </div>
  );
}
