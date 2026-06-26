"use client";

import * as React from "react";
import type { GenerationResult } from "@/lib/domain";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultCard } from "./result-card";
import { ResultCardBoundary } from "./result-card-boundary";
import { ResultRow } from "./result-row";

export type GalleryView = "grid" | "list";

interface GalleryCollectionProps {
  results: GenerationResult[];
  view: GalleryView;
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

interface ItemsProps {
  results: GenerationResult[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
}

export function GalleryGrid({ results, selectedIds, onToggleSelect }: ItemsProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {results.map((result) => (
        <ResultCardBoundary key={result.id}>
          <ResultCard
            result={result}
            selected={selectedIds?.includes(result.id)}
            onToggleSelect={onToggleSelect}
          />
        </ResultCardBoundary>
      ))}
    </div>
  );
}

export function GalleryList({ results, selectedIds, onToggleSelect }: ItemsProps) {
  return (
    <div className="flex flex-col gap-2.5">
      {results.map((result) => (
        <ResultCardBoundary key={result.id}>
          <ResultRow
            result={result}
            selected={selectedIds?.includes(result.id)}
            onToggleSelect={onToggleSelect}
          />
        </ResultCardBoundary>
      ))}
    </div>
  );
}

export function GalleryCollection({ results, view, selectedIds, onToggleSelect }: GalleryCollectionProps) {
  return view === "grid" ? (
    <GalleryGrid results={results} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
  ) : (
    <GalleryList results={results} selectedIds={selectedIds} onToggleSelect={onToggleSelect} />
  );
}

export function GallerySkeleton({ view }: { view: GalleryView }) {
  if (view === "list") {
    return (
      <div className="flex flex-col gap-2.5">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="bg-card flex items-center gap-4 rounded-xl border p-2.5">
            <Skeleton className="size-16 shrink-0 rounded-lg sm:size-20" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="bg-card flex flex-col overflow-hidden rounded-xl border">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
