"use client";

import { useMounted } from "@/lib/hooks";
import { StudioWorkspace } from "@/components/studio/studio-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function StudioSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid gap-6 xl:grid-cols-[19rem_minmax(0,1fr)_21rem]">
        <Card className="h-fit">
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Skeleton className="aspect-[4/5] w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
        <Card className="h-fit">
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function StudioPage() {
  const mounted = useMounted();
  if (!mounted) return <StudioSkeleton />;
  return <StudioWorkspace />;
}
