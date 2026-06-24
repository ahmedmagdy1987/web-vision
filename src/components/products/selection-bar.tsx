"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SelectionBarProps {
  count: number;
  onClear: () => void;
  onOpenInStudio: () => void;
}

export function SelectionBar({ count, onClear, onOpenInStudio }: SelectionBarProps) {
  const visible = count > 0;
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-20 z-40 flex justify-center px-4 pb-[env(safe-area-inset-bottom)] transition-all duration-200 md:bottom-0 md:pb-4",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-4 opacity-0",
      )}
      aria-hidden={!visible}
    >
      <div
        className={cn(
          "bg-card text-card-foreground pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-xl border px-4 py-3 shadow-lg",
        )}
        role="region"
        aria-label="Product selection"
      >
        <span className="bg-brand text-brand-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold">
          {count}
        </span>
        <span className="text-sm font-medium">
          {count} product{count === 1 ? "" : "s"} selected
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X />
            Clear
          </Button>
          <Button size="sm" onClick={onOpenInStudio}>
            <Sparkles />
            Use in mockup
          </Button>
        </div>
      </div>
    </div>
  );
}
