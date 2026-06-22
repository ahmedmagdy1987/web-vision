"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { appStore, useAppState } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import { AppLogo } from "./app-logo";
import { isNavItemActive, NAV_ITEMS } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarCollapsed } = useAppState();

  return (
    <aside
      data-collapsed={sidebarCollapsed}
      className={cn(
        "bg-sidebar text-sidebar-foreground border-sidebar-border hidden h-dvh shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
        sidebarCollapsed ? "w-16" : "w-60",
      )}
    >
      <div className={cn("flex h-14 items-center border-b px-3", sidebarCollapsed ? "justify-center" : "justify-between")}>
        <Link href="/" aria-label="Web Vision home">
          <AppLogo collapsed={sidebarCollapsed} />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item.href, pathname);
          const link = (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                sidebarCollapsed && "justify-center px-0",
              )}
            >
              {active && (
                <span className="bg-brand absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full" aria-hidden />
              )}
              <item.icon className={cn("size-5 shrink-0", active && "text-brand")} />
              {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          return sidebarCollapsed ? (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>{link}</TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ) : (
            link
          );
        })}
      </nav>

      <div className="border-t p-2">
        <Button
          variant="ghost"
          size={sidebarCollapsed ? "icon" : "sm"}
          onClick={() => appStore.toggleSidebar()}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn("w-full text-muted-foreground", !sidebarCollapsed && "justify-start gap-2")}
        >
          {sidebarCollapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          {!sidebarCollapsed && <span>Collapse</span>}
        </Button>
      </div>
    </aside>
  );
}
