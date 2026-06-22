import * as React from "react";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { PageTransition } from "./page-transition";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 pt-6 pb-24 md:px-6 md:pb-10">
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
