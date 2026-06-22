"use client";

import { useAppState } from "@/lib/hooks/use-app-store";
import { useMediaQuery } from "@/lib/hooks/use-media-query";

/** Resolve the effective light/dark theme from the user's preference. */
export function useResolvedTheme(): "light" | "dark" {
  const { theme } = useAppState();
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  if (theme === "system") return systemDark ? "dark" : "light";
  return theme;
}
