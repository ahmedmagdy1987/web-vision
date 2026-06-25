"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

/**
 * Per-card error boundary so a single malformed/legacy result can never blank the
 * whole Gallery. Renders a safe square fallback card and logs the error in dev
 * diagnostics only (no secrets). The mapper already normalizes snapshots — this is
 * the last line of defense.
 */
export class ResultCardBoundary extends React.Component<
  { children: React.ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    if (process.env.NODE_ENV !== "production") {
      console.error("[gallery] a result card failed to render", error);
    }
  }

  render(): React.ReactNode {
    if (this.state.failed) {
      return (
        <div className="bg-card text-muted-foreground flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center text-xs shadow-sm">
          <TriangleAlert className="size-5 opacity-60" />
          This result could not be displayed.
        </div>
      );
    }
    return this.props.children;
  }
}
