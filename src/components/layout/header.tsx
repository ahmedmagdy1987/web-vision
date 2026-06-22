"use client";

import Link from "next/link";
import { Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/common/search-input";
import { appStore, useAppState } from "@/lib/hooks";
import { AppLogo } from "./app-logo";
import { BrandSelector } from "./brand-selector";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  const { searchQuery } = useAppState();

  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
      <Link href="/" aria-label="Web Vision home" className="md:hidden">
        <AppLogo collapsed />
      </Link>

      <BrandSelector />

      <SearchInput
        value={searchQuery}
        onValueChange={(value) => appStore.setSearchQuery(value)}
        placeholder="Search brands, products, mockups…"
        containerClassName="ml-1 hidden max-w-md flex-1 sm:block"
        aria-label="Global search"
      />

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
