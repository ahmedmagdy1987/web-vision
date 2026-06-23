"use client";

import * as React from "react";
import Link from "next/link";
import { FolderKanban, MapPin, Package2, Star } from "lucide-react";
import type { GenerationResult } from "@/lib/domain";
import { CONTROL_LABELS } from "@/lib/domain";
import { useProjects } from "@/lib/hooks";
import { resultRepository } from "@/lib/repositories";
import { readableForeground } from "@/lib/theme/brand-accent";
import { AspectFrame } from "@/components/common/aspect-frame";
import { AssetImage } from "@/components/common/asset-image";
import { ReviewBadge } from "@/components/common/status-badge";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface ResultCardProps {
  result: GenerationResult;
}

/** Summarize a product-name list into a single line. */
function summarizeNames(names: string[]): string {
  if (names.length === 0) return "No products";
  if (names.length <= 2) return names.join(", ");
  return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
}

export function ResultCard({ result }: ResultCardProps) {
  const { snapshot } = result;
  const projects = useProjects();
  const project = result.projectId ? projects.find((p) => p.id === result.projectId) : undefined;

  const handleToggleFavorite = React.useCallback(() => {
    const next = resultRepository.toggleFavorite(result.id);
    toast.success(next?.favorite ? "Added to favorites" : "Removed from favorites");
  }, [result.id]);

  return (
    <div
      className={cn(
        "group bg-card text-card-foreground relative flex flex-col overflow-hidden rounded-xl border shadow-sm transition-all",
        "hover:border-brand-border hover:shadow-md focus-within:ring-2 focus-within:ring-ring/50",
      )}
    >
      <div className="relative">
        <AspectFrame ratio={snapshot.settings.aspectRatio} className="bg-muted">
          <AssetImage
            src={result.image.url}
            alt={`${snapshot.brandName} mockup`}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </AspectFrame>

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={result.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={result.favorite}
          className={cn(
            "absolute top-2 right-2 z-20 flex size-8 items-center justify-center rounded-full backdrop-blur-sm transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-ring/70",
            result.favorite
              ? "bg-background/90 text-warning hover:bg-background"
              : "bg-background/60 text-muted-foreground hover:bg-background/90 hover:text-foreground",
          )}
        >
          <Star className={cn("size-4", result.favorite && "fill-current")} />
        </button>

        <div className="pointer-events-none absolute top-2 left-2 z-20">
          <ReviewBadge review={result.review} />
        </div>
      </div>

      {/* Stretched link makes the whole card a single accessible navigation target. */}
      <Link
        href={`/gallery/${result.id}`}
        aria-label={`Open ${snapshot.brandName} mockup`}
        className="absolute inset-0 z-10 rounded-xl outline-none"
      />

      <div className="relative z-0 flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-center gap-2">
          <span
            className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
            style={{ backgroundColor: snapshot.brandAccent, color: readableForeground(snapshot.brandAccent) }}
            aria-hidden
          >
            {snapshot.brandName.slice(0, 1).toUpperCase()}
          </span>
          <span className="truncate text-sm font-semibold">{snapshot.brandName}</span>
        </div>

        <div className="text-muted-foreground flex flex-col gap-1 text-xs">
          <span className="flex items-center gap-1.5">
            <Package2 className="size-3.5 shrink-0" />
            <span className="truncate">{summarizeNames(snapshot.productNames)}</span>
          </span>
          {snapshot.locationName && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{snapshot.locationName}</span>
            </span>
          )}
          {project && (
            <span className="flex items-center gap-1.5">
              <FolderKanban className="size-3.5 shrink-0" />
              <span className="truncate">{project.name}</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <Badge variant="muted" className="font-normal">
            {CONTROL_LABELS.visualizationType[snapshot.settings.visualizationType]}
          </Badge>
          <Badge variant="outline" className="font-normal">
            {snapshot.settings.aspectRatio}
          </Badge>
        </div>
      </div>
    </div>
  );
}
