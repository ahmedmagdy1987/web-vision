import * as React from "react";
import type { AspectRatio } from "@/lib/domain";
import { ASPECT_RATIO_VALUES } from "@/lib/domain";
import { cn } from "@/lib/utils";

interface AspectFrameProps extends React.ComponentProps<"div"> {
  ratio?: AspectRatio | number;
}

/** Constrain children to a given aspect ratio. */
export function AspectFrame({ ratio = "1:1", className, style, children, ...props }: AspectFrameProps) {
  const value = typeof ratio === "number" ? ratio : ASPECT_RATIO_VALUES[ratio];
  return (
    <div
      className={cn("relative w-full overflow-hidden", className)}
      style={{ aspectRatio: String(value), ...style }}
      {...props}
    >
      {children}
    </div>
  );
}
