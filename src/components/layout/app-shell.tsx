"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
