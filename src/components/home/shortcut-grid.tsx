"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ImageIcon, Package, Palette, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface Shortcut {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
}

const SHORTCUTS: Shortcut[] = [
  {
    label: "Identity",
    href: "/identity",
    description: "Manage brands, accents and logo assets.",
    icon: Palette,
  },
  {
    label: "Products",
    href: "/products",
    description: "Build your product catalog with references.",
    icon: Package,
  },
  {
    label: "Studio",
    href: "/studio",
    description: "Compose a scene and generate visuals.",
    icon: Wand2,
  },
  {
    label: "Gallery",
    href: "/gallery",
    description: "Browse, review and reuse past mockups.",
    icon: ImageIcon,
  },
];

export function ShortcutGrid() {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Jump to</h2>
        <p className="text-muted-foreground text-sm">Everything you need to build a visual.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {SHORTCUTS.map((shortcut) => (
          <Link
            key={shortcut.href}
            href={shortcut.href}
            className="group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <Card className="h-full gap-3 p-5 transition-all hover:-translate-y-0.5 hover:border-brand-border hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-subtle text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <shortcut.icon className="size-5" />
                </span>
                <ArrowUpRight className="text-muted-foreground size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold">{shortcut.label}</p>
                <p className="text-muted-foreground text-sm">{shortcut.description}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
