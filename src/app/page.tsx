"use client";

import { useMounted } from "@/lib/hooks";
import { HomeGenerator } from "@/components/home/home-generator";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function HomeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardContent className="space-y-4 pt-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardContent>
        </Card>
        <Skeleton className="hidden aspect-[4/5] w-full rounded-xl lg:block" />
      </div>
    </div>
  );
}

// Home hosts the complete Malahi mockup-generation workflow.
export default function HomePage() {
  const mounted = useMounted();
  if (!mounted) return <HomeSkeleton />;
  return <HomeGenerator />;
}
