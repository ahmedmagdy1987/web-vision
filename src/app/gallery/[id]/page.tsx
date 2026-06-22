"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useMounted, useResults } from "@/lib/hooks";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResultDetail } from "@/components/gallery/result-detail";

export default function GalleryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const mounted = useMounted();
  const results = useResults();

  const result = React.useMemo(() => results.find((r) => r.id === id), [results, id]);

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/gallery">
          <ArrowLeft className="size-4" />
          Back to gallery
        </Link>
      </Button>

      {!mounted ? (
        <DetailSkeleton />
      ) : result ? (
        <ResultDetail result={result} />
      ) : (
        <EmptyState
          icon={ImageOff}
          title="Result not found"
          description="This mockup may have been removed or the link is no longer valid."
          action={
            <Button asChild>
              <Link href="/gallery">Back to gallery</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px] xl:grid-cols-[minmax(0,1fr)_440px]">
      <Skeleton className="aspect-[4/5] w-full rounded-xl" />
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-9" />
          <Skeleton className="h-9" />
          <Skeleton className="col-span-2 h-9" />
        </div>
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}
