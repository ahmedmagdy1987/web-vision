import type { ReactNode } from "react";
import { MalahiLogo } from "@/components/layout/app-logo";

/**
 * Shared shell for the authentication screens.
 *
 *  - Desktop (lg+): a split layout — a light, teal-tinted brand panel (so the navy
 *    Malahi logo reads in both themes) beside the screen-specific form, centered.
 *  - Mobile: a polished single column — a COMPACT brand header at the top, then the
 *    form in a contained card directly below it (no large centered gap), top-anchored
 *    so the important content stays within the first viewport. Heights are content-
 *    driven (no fixed-height sections), so the page never stretches or hides the
 *    submit button and it scrolls cleanly when the on-screen keyboard opens.
 *    Safe-area insets are respected via max(env(...), …).
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
    <div className="bg-background flex min-h-dvh flex-col lg:flex-row">
      {/* Brand header (mobile) / panel (desktop) — light in both themes for logo contrast. */}
      <aside className="relative flex shrink-0 flex-col gap-2.5 overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100 px-6 pt-[max(env(safe-area-inset-top),1.5rem)] pb-7 lg:w-[44%] lg:justify-between lg:gap-8 lg:px-12 lg:py-14">
        <div className="flex items-center">
          <MalahiLogo imgClassName="h-8 lg:h-11" />
        </div>
        <div className="max-w-sm">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl lg:text-[2rem] lg:leading-tight">
            Malahi Mockup Generator
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 lg:mt-2 lg:text-base">
            Create realistic branded product placements for client locations.
          </p>
        </div>
        <p className="text-xs font-medium text-slate-500">Internal tool · invite-only access</p>
        <span
          aria-hidden
          className="pointer-events-none absolute -right-20 -bottom-20 size-56 rounded-full bg-teal-300/30 blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -top-16 -left-10 size-40 rounded-full bg-cyan-200/40 blur-3xl"
        />
      </aside>

      {/* Form — top-anchored on mobile (right below the brand, no centered gap),
          centered in the panel on desktop. */}
      <main className="flex flex-1 flex-col items-center justify-start px-4 pt-7 pb-[max(env(safe-area-inset-bottom),1.5rem)] lg:justify-center lg:px-8 lg:py-10">
        <div className="bg-card w-full max-w-sm rounded-2xl border p-5 shadow-sm sm:p-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
          {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
          <div className={title || description ? "mt-6" : ""}>{children}</div>
          {footer && <div className="text-muted-foreground mt-6 text-center text-xs">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
