"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, ImageIcon, Wand2 } from "lucide-react";
import type { GenerationResult } from "@/lib/domain";
import { CONTROL_LABELS } from "@/lib/domain";
import { useResults } from "@/lib/hooks";
import { AssetImage } from "@/components/common/asset-image";
import { AspectFrame } from "@/components/common/aspect-frame";
import { EmptyState } from "@/components/common/empty-state";
import { ReviewBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const RECENT_COUNT = 6;

interface RecentMockupsProps {
  /** False until the client store has hydrated. */
  ready: boolean;
}

export function RecentMockups({ ready }: RecentMockupsProps) {
  const results = useResults();

  const recent = useMemo(
    () =>
      [...results]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, RECENT_COUNT),
    [results],
  );

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">Recent mockups</h2>
          <p className="text-muted-foreground text-sm">Your latest generated visuals.</p>
        </div>
        {recent.length > 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/gallery">
              View all
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        )}
      </div>

      {!ready ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {Array.from({ length: RECENT_COUNT }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/5] w-full rounded-xl" />
          ))}
        </div>
      ) : recent.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No mockups yet"
          description="Generate your first visual in Studio and it will show up here."
          action={
            <Button asChild>
              <Link href="/studio">
                <Wand2 className="size-4" />
                Open Studio
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {recent.map((result) => (
            <MockupCard key={result.id} result={result} />
          ))}
        </div>
      )}
    </section>
  );
}

function MockupCard({ result }: { result: GenerationResult }) {
  const vizLabel =
    CONTROL_LABELS.visualizationType[result.snapshot.settings.visualizationType] ?? "Mockup";

  return (
    <Link
      href={`/gallery/${result.id}`}
      className="group block overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <AspectFrame ratio={result.snapshot.settings.aspectRatio} className="bg-muted">
        <AssetImage
          src={result.image.url}
          alt={`${result.snapshot.brandName} — ${vizLabel}`}
          className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        <div className="absolute right-2 top-2">
          <ReviewBadge review={result.review} />
        </div>
      </AspectFrame>
      <div className="space-y-0.5 p-2.5">
        <p className="truncate text-xs font-semibold">{result.snapshot.brandName}</p>
        <p className="text-muted-foreground truncate text-[11px]">{vizLabel}</p>
      </div>
    </Link>
  );
}
