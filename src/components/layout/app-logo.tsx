import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Official Malahi application logo (public/malahi-logo.png) — the navy + teal
 * lockup. Its native aspect ratio is always preserved via `object-contain`
 * (never stretched, squashed or redrawn); delivery is optimized by next/image.
 *
 * `MalahiLogo` renders the asset as-is — use it on light surfaces (the auth
 * panels). `AppLogo` adds the dark-mode treatment for the in-app shell.
 *
 * NOTE: this is the permanent application identity — distinct from the client
 * logos employees select inside the Logo Library for mockup generation.
 */
export function MalahiLogo({ className, imgClassName }: { className?: string; imgClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center", className)}>
      <Image
        src="/malahi-logo.png"
        alt="Malahi"
        width={250}
        height={132}
        priority
        className={cn("w-auto object-contain", imgClassName ?? "h-7")}
      />
    </span>
  );
}

/**
 * Shell logo for the dark-capable nav (sidebar + mobile header). The navy lockup
 * has poor contrast on those dark surfaces, so in dark mode it is rendered as a
 * clean white silhouette — `brightness-0 invert` recolors it to white while
 * keeping the exact shape + transparency, so there is no white backing pill/band
 * behind it and nothing is distorted.
 */
export function AppLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <MalahiLogo
      className={className}
      imgClassName={cn(collapsed ? "h-6 max-w-[44px]" : "h-7", "dark:brightness-0 dark:invert")}
    />
  );
}
