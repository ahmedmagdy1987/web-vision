"use client";

import Link from "next/link";
import { Palette } from "lucide-react";
import { useActiveBrand, useMounted } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { Hero } from "@/components/home/hero";
import { QuickStartCard } from "@/components/home/quick-start-card";
import { MetricsRow } from "@/components/home/metrics-row";
import { RecentMockups } from "@/components/home/recent-mockups";
import { RecentActivity } from "@/components/home/recent-activity";
import { ShortcutGrid } from "@/components/home/shortcut-grid";
import { BrandSpotlight } from "@/components/home/brand-spotlight";

export default function HomePage() {
  const { brand } = useActiveBrand();
  const ready = useMounted();

  return (
    <div className="flex flex-col gap-8">
      <div className="order-1">
        <Hero brand={brand} ready={ready} />
      </div>

      {/* On mobile, Quick Create comes before metrics; desktop keeps metrics first. */}
      <div className="order-3 lg:order-2">
        <MetricsRow ready={ready} />
      </div>

      <div className="order-2 grid gap-6 lg:order-3 lg:grid-cols-[1.6fr_1fr]">
        <QuickStartCard brand={brand} />
        <div className="space-y-6">
          {!ready ? (
            <BrandSpotlightSkeleton />
          ) : brand ? (
            <BrandSpotlight brand={brand} />
          ) : (
            <NoBrandCard />
          )}
          <RecentActivity ready={ready} />
        </div>
      </div>

      <div className="order-4">
        <RecentMockups ready={ready} />
      </div>

      <div className="order-5">
        <ShortcutGrid />
      </div>
    </div>
  );
}

function BrandSpotlightSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-40" />
          </div>
        </div>
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-16 rounded-lg" />
          <Skeleton className="h-16 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-full rounded-md" />
      </CardContent>
    </Card>
  );
}

function NoBrandCard() {
  return (
    <Card className="justify-center">
      <CardContent className="py-2">
        <EmptyState
          icon={Palette}
          title="No brand yet"
          description="Create a brand with an accent color and logo to unlock the studio."
          action={
            <Button asChild>
              <Link href="/identity">Create a brand</Link>
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
