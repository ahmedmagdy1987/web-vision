import { cn } from "@/lib/utils";

/**
 * Malahi application wordmark — TEXT ONLY (temporary).
 *
 * No invented icon/symbol is used. The OFFICIAL Malahi logo asset is required and
 * should be dropped at `public/malahi-logo.svg` (and reintroduced here, in
 * `src/app/icon.svg` and `src/app/apple-icon.tsx`). NOTE: the logos shown inside
 * the Logo Library and generated mockups are the team's *client* brand assets —
 * not the application's official Malahi identity.
 */
export function AppLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  if (collapsed) {
    // Compact text lettermark for the collapsed sidebar / mobile header.
    return (
      <span className={cn("text-brand text-xl font-bold tracking-tight", className)} aria-label="Malahi">
        M
      </span>
    );
  }
  return (
    <div className={cn("min-w-0 leading-tight", className)}>
      <p className="text-base font-bold tracking-tight">
        <span className="text-brand">Malahi</span>
      </p>
      <p className="text-muted-foreground truncate text-[11px]">Mockup Generator</p>
    </div>
  );
}
