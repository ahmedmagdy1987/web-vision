"use client";

import { usePathname } from "next/navigation";
import { OrgOnboarding } from "@/components/auth/org-onboarding";
import { useAuth } from "@/lib/auth/auth-context";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { Sidebar } from "./sidebar";

function FullScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background text-muted-foreground flex min-h-dvh items-center justify-center text-sm">
      {children}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, ready, user, activeOrg } = useAuth();

  // Auth routes render outside the application shell.
  if (pathname.startsWith("/sign-in") || pathname.startsWith("/auth")) {
    return <>{children}</>;
  }

  // Protected shell (Supabase mode only; demo mode is always open).
  if (mode === "supabase") {
    if (!ready) return <FullScreen>Loading your workspace…</FullScreen>;
    if (!user) return <FullScreen>Redirecting to sign in…</FullScreen>;
    if (!activeOrg) return <OrgOnboarding />;
  }

  // Studio is a workspace and gets more horizontal room than admin pages.
  const wide = pathname.startsWith("/studio");

  return (
    <div className="flex h-dvh w-full overflow-hidden">
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
