/* eslint-disable @next/next/no-img-element -- AssetImage intentionally renders user-uploaded data: URLs through a plain <img>; next/image is unsuitable for arbitrary client-generated data URLs. */
"use client";

import * as React from "react";
import { ImageOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssetImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  /** Extra classes for the fallback container (e.g. to match a ratio). */
  fallbackClassName?: string;
  /** Icon shown in the fallback (e.g. Package for products, MapPin for locations). */
  fallbackIcon?: LucideIcon;
  /** Label shown in the fallback (e.g. "No image uploaded"). */
  fallbackLabel?: string;
}

/**
 * Renders an image asset (data URL or remote signed URL). When `src` is missing
 * OR the image fails to load (e.g. an expired signed URL), it shows a clean,
 * professional fallback — an icon + label on a neutral surface — instead of the
 * browser's broken-image icon. The fallback fills the container so the ratio is
 * preserved, and is visually distinct from a loading state.
 */
export function AssetImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackIcon: FallbackIcon = ImageOff,
  fallbackLabel,
  ...props
}: AssetImageProps) {
  const [errored, setErrored] = React.useState(false);
  const [lastSrc, setLastSrc] = React.useState(src);

  // Reset the error state when the source changes (e.g. a refreshed signed URL).
  // Adjust-state-during-render pattern (no effect): React handles this without a
  // cascading re-render.
  if (src !== lastSrc) {
    setLastSrc(src);
    setErrored(false);
  }

  if (!src || errored) {
    // Decorative usages pass alt="" — hide the fallback from assistive tech.
    const decorative = alt === "" && !fallbackLabel;
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex flex-col items-center justify-center gap-1 p-2 text-center",
          className,
          fallbackClassName,
        )}
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": fallbackLabel ?? alt })}
      >
        <FallbackIcon className="size-5 shrink-0 opacity-50" aria-hidden />
        {fallbackLabel && <span className="text-[10px] leading-tight font-medium opacity-70">{fallbackLabel}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setErrored(true)}
      className={className}
      {...props}
    />
  );
}
