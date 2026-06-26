import type { ReactNode } from "react";
import { MalahiLogo } from "@/components/layout/app-logo";

/**
 * Shared shell for the authentication screens — a composed split layout:
 * a fixed light, teal-tinted brand panel (so the navy Malahi logo reads in both
 * light and dark mode without a white pill) beside the screen-specific form.
 * On mobile it collapses to a single column (compact brand header + form).
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
      {/* Brand panel — intentionally light in both themes for logo contrast. */}
      <aside className="relative flex flex-col gap-5 overflow-hidden bg-gradient-to-br from-slate-50 via-teal-50 to-cyan-100 px-6 py-8 lg:w-[44%] lg:justify-between lg:gap-8 lg:px-12 lg:py-14">
        <div className="flex items-center">
          <MalahiLogo imgClassName="h-9 lg:h-11" />
        </div>
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-[2rem] lg:leading-tight">
            Malahi Mockup Generator
          </h1>
          <p className="mt-2 text-sm text-slate-600 lg:text-base">
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

      {/* Form panel */}
      <main className="flex flex-1 items-center justify-center px-4 py-10 lg:px-8">
        <div className="w-full max-w-sm">
          {title && <h2 className="text-xl font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
          <div className={title || description ? "mt-6" : ""}>{children}</div>
          {footer && <div className="text-muted-foreground mt-6 text-center text-xs">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
