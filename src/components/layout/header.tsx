"use client";

import Link from "next/link";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppLogo } from "./app-logo";
import { BrandSelector } from "./brand-selector";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
      <Link href="/" aria-label="Web Vision home" className="md:hidden">
        <AppLogo collapsed />
      </Link>

      <BrandSelector />

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/studio">
            <Wand2 className="size-4" />
            Studio
          </Link>
        </Button>
      </div>
    </header>
  );
}
