"use client";

import type { LucideIcon } from "lucide-react";
import { ImageIcon, MapPin, Package, Palette } from "lucide-react";
import { useBrands, useLocations, useProducts, useResults } from "@/lib/hooks";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface MetricsRowProps {
  /** False until the client store has hydrated. */
  ready: boolean;
}

interface Metric {
  label: string;
  value: number;
  icon: LucideIcon;
}

export function MetricsRow({ ready }: MetricsRowProps) {
  const brands = useBrands();
  const products = useProducts();
  const locations = useLocations();
  const results = useResults();

  const metrics: Metric[] = [
    {
      label: "Active brands",
      value: brands.filter((b) => b.status === "active").length,
      icon: Palette,
    },
    {
      label: "Products",
      value: products.filter((p) => p.status === "active").length,
      icon: Package,
    },
    {
      label: "Locations",
      value: locations.length,
      icon: MapPin,
    },
    {
      label: "Mockups",
      value: results.length,
      icon: ImageIcon,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className="flex-row items-center gap-3 p-4 transition-colors hover:border-brand-border"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
            <metric.icon className="size-5" />
          </span>
          <div className="min-w-0">
            {ready ? (
              <p className="text-2xl font-semibold leading-tight tabular-nums">{metric.value}</p>
            ) : (
              <Skeleton className="h-7 w-10" />
            )}
            <p className="text-muted-foreground truncate text-xs font-medium">{metric.label}</p>
          </div>
        </Card>
      ))}
    </div>
  );
}
