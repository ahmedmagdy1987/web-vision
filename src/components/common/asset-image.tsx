/* eslint-disable @next/next/no-img-element -- AssetImage intentionally renders user-uploaded data: URLs through a plain <img>; next/image is unsuitable for arbitrary client-generated data URLs. */
import * as React from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AssetImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src"> {
  src?: string | null;
  alt: string;
  /** Shown when `src` is missing. */
  fallbackClassName?: string;
}

/** Renders an image asset (data URL or remote), with a graceful empty fallback. */
export function AssetImage({ src, alt, className, fallbackClassName, ...props }: AssetImageProps) {
  if (!src) {
    // Decorative usages pass alt="" — hide the fallback from assistive tech
    // rather than exposing an img role with an empty accessible name.
    const decorative = alt === "";
    return (
      <div
        className={cn(
          "bg-muted text-muted-foreground flex items-center justify-center",
          className,
          fallbackClassName,
        )}
        {...(decorative ? { "aria-hidden": true } : { role: "img", "aria-label": alt })}
      >
        <ImageOff className="size-5 opacity-60" />
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} {...props} />;
}
