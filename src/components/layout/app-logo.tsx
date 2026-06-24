import { cn } from "@/lib/utils";

/**
 * Malahi mark — a stylized ferris wheel for the entertainment/amusement brand.
 * Inherits `currentColor` so it renders white on the brand-colored chip.
 * NOTE: this is a crafted brand mark for the simplified review candidate; swap
 * with the official Malahi logo at `public/malahi-logo.svg` when available.
 */
export function MalahiMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="10" r="6.7" />
      <path d="M12 10V3.3M12 10h6.7M12 10v6.7M12 10H5.3M12 10l4.74-4.74M12 10l4.74 4.74M12 10l-4.74 4.74M12 10L7.26 5.26" />
      <circle cx="12" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <path d="M7.8 16.2 12 11.4l4.2 4.8" />
      <path d="M6.2 19.4h11.6" />
    </svg>
  );
}

/** Malahi product wordmark + mark used across the application shell. */
export function AppLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="bg-brand text-brand-foreground flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm">
        <MalahiMark className="size-6" />
      </div>
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <p className="truncate text-sm font-bold tracking-tight">Malahi</p>
          <p className="text-muted-foreground truncate text-[11px]">Mockup Studio</p>
        </div>
      )}
    </div>
  );
}
