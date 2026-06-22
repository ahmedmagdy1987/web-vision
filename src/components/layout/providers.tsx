"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "@/components/ui/sonner";
import { useActiveBrand } from "@/lib/hooks";
import { setStorageErrorHandler } from "@/lib/repositories/storage";
import { applyBrandAccent } from "@/lib/theme/brand-accent";
import { useResolvedTheme } from "@/lib/theme/use-theme";

function ThemeApplier() {
  const theme = useResolvedTheme();
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  return null;
}

function BrandAccentApplier() {
  const { brand } = useActiveBrand();
  React.useEffect(() => {
    applyBrandAccent(brand?.accentColor);
  }, [brand?.accentColor]);
  return null;
}

function StorageErrorReporter() {
  React.useEffect(() => {
    let last = 0;
    setStorageErrorHandler(() => {
      // Throttle so a burst of failed writes shows a single message.
      const now = Date.now();
      if (now - last < 4000) return;
      last = now;
      toast.error("Couldn't save changes — local storage may be full. Try removing large uploads.");
    });
    return () => setStorageErrorHandler(null);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ThemeApplier />
      <BrandAccentApplier />
      <StorageErrorReporter />
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
