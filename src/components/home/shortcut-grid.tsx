"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ImageIcon, Package, Palette, TriangleAlert, Wand2 } from "lucide-react";
import { useBrands, useProducts, useResults } from "@/lib/hooks";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ShortcutStatus {
  label: string;
  warning?: boolean;
}

interface Shortcut {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
  status: ShortcutStatus;
}

export function ShortcutGrid() {
  const brands = useBrands();
  const products = useProducts();
  const results = useResults();

  const activeBrands = brands.filter((b) => b.status === "active").length;
  const activeProducts = products.filter((p) => p.status === "active").length;
  const canCompose = activeBrands > 0 && activeProducts > 0;

  const shortcuts: Shortcut[] = [
    {
      label: "Identity",
      href: "/identity",
      description: "Manage brands, accents and logo assets.",
      icon: Palette,
      status:
        activeBrands === 0
          ? { label: "Add your first brand", warning: true }
          : { label: `${activeBrands} active ${activeBrands === 1 ? "brand" : "brands"}` },
    },
    {
      label: "Products",
      href: "/products",
      description: "Build your catalog with reference images.",
      icon: Package,
      status:
        activeProducts === 0
          ? { label: "No products yet", warning: true }
          : { label: `${activeProducts} active ${activeProducts === 1 ? "product" : "products"}` },
    },
    {
      label: "Studio",
      href: "/studio",
      description: "Compose a scene and generate visuals.",
      icon: Wand2,
      status: canCompose ? { label: "Ready to compose" } : { label: "Add assets to start", warning: true },
    },
    {
      label: "Gallery",
      href: "/gallery",
      description: "Browse, review and reuse past mockups.",
      icon: ImageIcon,
      status: { label: `${results.length} ${results.length === 1 ? "mockup" : "mockups"}` },
    },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Jump to</h2>
        <p className="text-muted-foreground text-sm">Everything you need to build a visual.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {shortcuts.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Card className="h-full gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="bg-brand-subtle text-brand group-hover:bg-brand group-hover:text-brand-foreground flex size-10 items-center justify-center rounded-lg transition-colors">
                  <shortcut.icon className="size-5" />
                </span>
                <ArrowUpRight className="text-muted-foreground group-hover:text-brand size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{shortcut.label}</p>
                <p className="text-muted-foreground text-sm">{shortcut.description}</p>
              </div>
              <p
                className={cn(
                  "mt-auto flex items-center gap-1 pt-1 text-xs font-medium",
                  shortcut.status.warning ? "text-warning" : "text-muted-foreground",
                )}
              >
                {shortcut.status.warning && <TriangleAlert className="size-3.5" />}
                {shortcut.status.label}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
