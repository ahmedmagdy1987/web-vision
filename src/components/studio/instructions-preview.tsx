"use client";

import * as React from "react";
import { ChevronDown, Copy, FileCode } from "lucide-react";
import type { ComposedInstructions } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export function InstructionsPreview({ instructions }: { instructions: ComposedInstructions }) {
  const [open, setOpen] = React.useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(instructions.text);
      toast.success("Instructions copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <FileCode className="text-muted-foreground size-4" />
        <span className="text-sm font-medium">Generated instructions</span>
        <span className="text-muted-foreground ml-1 text-xs">{instructions.sections.length} sections</span>
        <ChevronDown className={cn("text-muted-foreground ml-auto size-4 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-4 border-t px-4 py-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={copy}>
              <Copy />
              Copy all
            </Button>
          </div>
          <dl className="space-y-3">
            {instructions.sections.map((section) => (
              <div key={section.key} className="space-y-1">
                <dt className="text-brand text-xs font-semibold uppercase tracking-wide">{section.label}</dt>
                <dd className="text-muted-foreground bg-muted/40 rounded-md p-2 font-mono text-xs whitespace-pre-wrap">
                  {section.content}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}
