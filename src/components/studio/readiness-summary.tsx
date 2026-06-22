"use client";

import { Check, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReadinessItem {
  label: string;
  done: boolean;
}

/** Compact checklist showing what is selected and what is still required. */
export function ReadinessSummary({ items }: { items: ReadinessItem[] }) {
  const ready = items.every((i) => i.done);
  const doneCount = items.filter((i) => i.done).length;

  return (
    <div className="bg-card rounded-xl border p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Generation readiness</h3>
        <span className={cn("text-xs font-medium", ready ? "text-success" : "text-muted-foreground")}>
          {doneCount}/{items.length} ready
        </span>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5 text-xs">
            {item.done ? (
              <span className="bg-success/15 text-success flex size-4 items-center justify-center rounded-full">
                <Check className="size-3" strokeWidth={3} />
              </span>
            ) : (
              <Circle className="text-muted-foreground/50 size-4" />
            )}
            <span className={cn(item.done ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
