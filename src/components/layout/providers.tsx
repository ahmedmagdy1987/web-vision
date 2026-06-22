"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useActiveBrand } from "@/lib/hooks";
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

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <ThemeApplier />
      <BrandAccentApplier />
      {children}
      <Toaster />
    </TooltipProvider>
  );
}
