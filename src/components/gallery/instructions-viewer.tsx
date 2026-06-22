"use client";

import * as React from "react";
import { ChevronDown, Copy, FileText } from "lucide-react";
import type { ComposedInstructions } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

interface InstructionsViewerProps {
  instructions: ComposedInstructions;
}

export function InstructionsViewer({ instructions }: InstructionsViewerProps) {
  const [open, setOpen] = React.useState(false);
  const hasSections = instructions.sections.length > 0;

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(instructions.text);
      toast.success("Instructions copied to clipboard");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  }, [instructions.text]);

  return (
    <div className="rounded-xl border">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="composed-instructions-body"
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left transition-colors outline-none",
          "hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring/50",
        )}
      >
        <span className="flex items-center gap-2 text-sm font-medium">
          <FileText className="text-muted-foreground size-4" />
          Composed instructions
        </span>
        <ChevronDown
          className={cn("text-muted-foreground size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div id="composed-instructions-body" className="space-y-4 border-t px-4 py-4">
          {hasSections ? (
            <dl className="space-y-3">
              {instructions.sections.map((section) => (
                <div key={section.key} className="space-y-1">
                  <dt className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                    {section.label}
                  </dt>
                  <dd className="text-foreground/90 text-sm whitespace-pre-wrap">{section.content}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-foreground/90 text-sm whitespace-pre-wrap">{instructions.text}</p>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="size-4" />
              Copy prompt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
