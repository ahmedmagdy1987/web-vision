import type { ReactNode } from "react";
import { MalahiLogo } from "@/components/layout/app-logo";

/**
 * Shared shell for the authentication screens.
 *
 *  - Desktop (lg+) — APPROVED, unchanged: a split layout with a light, teal-tinted
 *    brand panel (so the navy Malahi logo reads in both themes) beside the form.
 *  - Mobile: ONE cohesive composition — a continuous theme-aware background with a
 *    subtle Malahi teal/navy ambient (no hard light/dark split), a compact brand
 *    header, and an integrated form card directly below it. The logo reads in both
 *    themes (navy on light, white on dark) via two breakpoint-scoped instances.
 *    Heights are content-driven (no fixed-height sections) so it stays compact in
 *    the first viewport, scrolls cleanly when the keyboard opens, and respects
 *    safe-area insets via max(env(...), …).
 */
export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="bg-background relative flex min-h-dvh flex-col overflow-hidden lg:flex-row lg:overflow-visible">
      {/* Mobile-only ambient — a subtle continuous teal/navy treatment over the
          whole page so there is no harsh horizontal color division. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-teal-400/20 blur-3xl lg:hidden dark:bg-teal-500/15"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/3 -right-20 size-64 rounded-full bg-cyan-400/15 blur-3xl lg:hidden dark:bg-cyan-500/10"
      />

      {/* Brand — light teal split panel on desktop; transparent compact header on mobile. */}
      <aside className="relative z-10 flex shrink-0 flex-col gap-2.5 px-6 pt-[max(env(safe-area-inset-top),2rem)] pb-4 lg:w-[44%] lg:justify-between lg:gap-8 lg:overflow-hidden lg:bg-gradient-to-br lg:from-slate-50 lg:via-teal-50 lg:to-cyan-100 lg:px-12 lg:py-14">
        <div className="flex items-center">
          {/* Mobile: navy on light, white on dark. Desktop: always navy (light panel). */}
          <MalahiLogo className="lg:hidden" imgClassName="h-8 dark:brightness-0 dark:invert" />
          <MalahiLogo className="hidden lg:flex" imgClassName="lg:h-11" />
        </div>
        <div className="max-w-sm">
          <h1 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl lg:text-[2rem] lg:leading-tight lg:text-slate-900">
            Malahi Mockup Generator
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm lg:mt-2 lg:text-base lg:text-slate-600">
            Create realistic branded product placements for client locations.
          </p>
        </div>
        <p className="text-muted-foreground text-xs font-medium lg:text-slate-500">Internal tool · invite-only access</p>
        {/* Desktop-only decorative blobs inside the brand panel. */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 hidden size-56 rounded-full bg-teal-300/30 blur-3xl lg:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-10 hidden size-40 rounded-full bg-cyan-200/40 blur-3xl lg:block"
        />
      </aside>

      {/* Form — integrated card on mobile (top-anchored), plain centered panel on desktop. */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-start px-4 pt-3 pb-[max(env(safe-area-inset-bottom),1.5rem)] lg:justify-center lg:px-8 lg:py-10 lg:pt-10">
        <div className="bg-card/95 w-full max-w-sm rounded-2xl border p-5 shadow-lg backdrop-blur-sm sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none lg:backdrop-blur-none">
          {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
          <div className={title || description ? "mt-6" : ""}>{children}</div>
          {footer && <div className="text-muted-foreground mt-6 text-center text-xs">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
