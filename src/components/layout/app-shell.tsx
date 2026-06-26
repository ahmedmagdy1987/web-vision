"use client";

import { usePathname } from "next/navigation";
import { PendingAccess } from "@/components/auth/pending-access";
import { resolveAccessGate } from "@/lib/auth/access-gate";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MalahiLogo } from "./app-logo";
import { DocumentTitle } from "./document-title";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { Sidebar } from "./sidebar";

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-muted-foreground flex min-h-dvh items-center justify-center px-4 text-sm">
      {children}
    </div>
  );
}

/** Polished brand loading state used for both session and access resolution. */
function AuthSplash({ label }: { label: string }) {
  return (
    <FullScreen>
      <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
        <span className="inline-flex p-2">
          <MalahiLogo imgClassName="h-8 dark:brightness-0 dark:invert" />
        </span>
        <span>{label}</span>
      </div>
    </FullScreen>
  );
}

/** Membership/access lookup FAILED (network/server) — distinct from "no access". */
function MembershipError({ onRetry }: { onRetry: () => void }) {
  const { signOut } = useAuth();
  return (
    <FullScreen>
      <div className="flex max-w-sm flex-col items-center gap-4 text-center">
        <span className="inline-flex p-2">
          <MalahiLogo imgClassName="h-8 dark:brightness-0 dark:invert" />
        </span>
        <div className="space-y-1">
          <p className="text-foreground font-medium">We couldn&apos;t check your access</p>
          <p className="text-muted-foreground text-sm">
            Something went wrong while loading your account. Check your connection and try again.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={onRetry}>Try again</Button>
          <Button variant="outline" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      </div>
    </FullScreen>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, ready, user, activeOrg, membershipStatus, refreshMembership } = useAuth();

  // Auth routes render outside the application shell.
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  // Resolve the access gate from the SEPARATED auth/membership states so an
  // authorized user never flashes the pending (or sign-in, or app) screen.
  const gate = resolveAccessGate({
    mode,
    ready,
    hasUser: !!user,
    hasActiveOrg: !!activeOrg,
    membershipStatus,
  });
  if (gate === "session-loading") return <AuthSplash label="Loading…" />;
  if (gate === "redirect-signin") return <FullScreen>Redirecting to sign in…</FullScreen>;
  if (gate === "membership-loading") return <AuthSplash label="Checking your access…" />;
  if (gate === "membership-error") return <MembershipError onRetry={refreshMembership} />;
  if (gate === "pending") return <PendingAccess />;

  // gate === "authorized" → render the full application shell.
  // Home hosts the full mockup-generation workflow and gets more horizontal room.
  const wide = pathname === "/";

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <DocumentTitle />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div
            className={cn(
              "mx-auto w-full px-4 pt-6 pb-24 md:px-6 md:pb-10",
              wide ? "max-w-[112rem]" : "max-w-7xl",
            )}
          >
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
