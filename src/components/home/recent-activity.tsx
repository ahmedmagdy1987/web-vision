"use client";

import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";
import { useBrands, useJobs } from "@/lib/hooks";
import { JobStatusBadge } from "@/components/common/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

function relativeTime(iso: string): string {
  const diffMs = new Date("2026-06-22T10:00:30.000Z").getTime() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diffMs / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function RecentActivity({ ready }: { ready: boolean }) {
  const jobs = useJobs();
  const brands = useBrands();
  const brandName = (id: string) => brands.find((b) => b.id === id)?.name ?? "Unknown brand";

  const recent = [...jobs]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="text-brand size-4" />
            Recent activity
          </CardTitle>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link href="/gallery">
              Gallery
              <ArrowRight className="size-3.5" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!ready ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <p className="text-muted-foreground text-sm">No generation activity yet.</p>
        ) : (
          <ul className="divide-border divide-y">
            {recent.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{brandName(job.request.brandId)}</p>
                  <p className="text-muted-foreground text-xs">
                    {job.request.productIds.length} product{job.request.productIds.length === 1 ? "" : "s"} ·{" "}
                    {relativeTime(job.updatedAt)}
                  </p>
                </div>
                <JobStatusBadge status={job.status} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
