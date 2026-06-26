"use client";

import Link from "next/link";
import { AccountMenu } from "./account-menu";
import { AppLogo } from "./app-logo";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="bg-background/80 sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b px-3 backdrop-blur md:px-5">
      <Link
        href="/"
        aria-label="Malahi home"
        className="rounded-md p-1 md:hidden dark:bg-white"
      >
        <AppLogo collapsed />
      </Link>

      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <AccountMenu />
      </div>
    </header>
  );
}
