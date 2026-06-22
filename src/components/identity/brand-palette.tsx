"use client";

import * as React from "react";
import { readableForeground } from "@/lib/theme/brand-accent";
import { cn } from "@/lib/utils";

interface BrandPaletteProps {
  accent: string;
  className?: string;
}

interface Swatch {
  label: string;
  /** CSS color value (may use color-mix for tints/shades). */
  color: string;
}

/**
 * A small derived palette from a brand accent: a few tints and shades plus the
 * base accent, with a readable-foreground sample on the base swatch.
 */
export function BrandPalette({ accent, className }: BrandPaletteProps) {
  const foreground = readableForeground(accent);

  const swatches: Swatch[] = [
    { label: "Tint 30", color: `color-mix(in srgb, ${accent} 30%, white)` },
    { label: "Tint 15", color: `color-mix(in srgb, ${accent} 60%, white)` },
    { label: "Base", color: accent },
    { label: "Shade 15", color: `color-mix(in srgb, ${accent} 78%, black)` },
    { label: "Shade 30", color: `color-mix(in srgb, ${accent} 58%, black)` },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex overflow-hidden rounded-lg border shadow-sm">
        {swatches.map((swatch) => (
          <div
            key={swatch.label}
            className="group relative h-14 flex-1"
            style={{ backgroundColor: swatch.color }}
            title={swatch.label}
          >
            <span className="absolute inset-x-0 bottom-1 text-center text-[10px] font-medium text-white opacity-0 mix-blend-difference transition-opacity group-hover:opacity-100">
              {swatch.label}
            </span>
          </div>
        ))}
      </div>
      <div
        className="flex items-center justify-between rounded-lg px-4 py-3"
        style={{ backgroundColor: accent, color: foreground }}
      >
        <span className="text-sm font-semibold">Readable foreground</span>
        <span className="font-mono text-xs uppercase opacity-90">{accent}</span>
      </div>
    </div>
  );
}
