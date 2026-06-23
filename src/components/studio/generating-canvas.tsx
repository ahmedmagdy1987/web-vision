"use client";

import * as React from "react";
import { Sparkles, X } from "lucide-react";
import type { GenerationJob } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STAGES = [
  "Preparing assets",
  "Reading the location",
  "Composing the scene",
  "Integrating products",
  "Applying brand identity",
  "Rendering final outputs",
];

/**
 * Premium "cooking" overlay for the generation canvas. Stage-based progress
 * (never a fake exact percentage), animated gradient + light sweep + ambient
 * shapes, elapsed time, optional cancel, and a calm reduced-motion fallback.
 * Renders as an absolute overlay inside the canvas AspectFrame.
 */
export function GeneratingCanvas({ job, onCancel }: { job: GenerationJob | null; onCancel?: () => void }) {
  const progress = job?.progress ?? 0;
  const queued = job?.status === "queued";
  const stageIndex = queued ? 0 : Math.min(STAGES.length - 1, Math.floor((progress / 100) * STAGES.length));
  const stage = STAGES[stageIndex];

  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    const start = performance.now();
    const id = setInterval(() => setElapsed(Math.floor((performance.now() - start) / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden" data-testid="studio-generating">
      {/* Animated gradient base (calm static gradient under reduced motion). */}
      <div
        className="from-brand/40 via-background/85 to-indigo-500/25 absolute inset-0 bg-gradient-to-br motion-safe:animate-pulse"
        aria-hidden
      />
      {/* Slow rotating light + shimmer (hidden under reduced motion). */}
      <div className="absolute inset-0 motion-reduce:hidden" aria-hidden>
        <div className="absolute -inset-1/2 animate-spin bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.20),transparent_45%)] [animation-duration:9s]" />
        <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_35%,rgba(255,255,255,0.14)_50%,transparent_65%)] animate-pulse [animation-duration:2.4s]" />
        <span className="bg-brand/30 absolute left-[14%] top-[18%] size-24 animate-pulse rounded-full blur-2xl" />
        <span className="absolute bottom-[16%] right-[12%] size-28 animate-pulse rounded-full bg-indigo-400/25 blur-3xl [animation-duration:3s]" />
      </div>

      {/* Status content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-[2px]">
        <span className="bg-background/75 flex size-12 items-center justify-center rounded-full border shadow-sm">
          <Sparkles className="text-brand size-6 motion-safe:animate-pulse" />
        </span>
        <p aria-live="polite" className="text-base font-semibold">
          {stage}
        </p>
        {/* Keep this exact phrasing — relied on by the generation E2E. */}
        <p className="text-muted-foreground text-xs">Generating your mockup… · {elapsed}s</p>
        <div className="flex items-center gap-1.5" aria-hidden>
          {STAGES.map((s, i) => (
            <span
              key={s}
              className={cn("size-1.5 rounded-full transition-colors", i <= stageIndex ? "bg-brand" : "bg-muted-foreground/30")}
            />
          ))}
        </div>
        {onCancel && (
          <Button variant="outline" size="sm" onClick={onCancel} className="mt-1">
            <X className="size-4" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
