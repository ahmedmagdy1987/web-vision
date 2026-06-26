"use client";

import * as React from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster, toast } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth/auth-context";
import { setRepositoryErrorHandler } from "@/lib/repositories/error-reporter";
import { setStorageErrorHandler } from "@/lib/repositories/storage";
import { useResolvedTheme } from "@/lib/theme/use-theme";

function ThemeApplier() {
  const theme = useResolvedTheme();
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
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

function RepositoryErrorReporter() {
  React.useEffect(() => {
    let last = 0;
    setRepositoryErrorHandler(({ context, reverted }) => {
      const now = Date.now();
      if (now - last < 3000) return;
      last = now;
      toast.error(reverted ? `Couldn't ${context} — your change was reverted.` : `Couldn't ${context}.`);
    });
    return () => setRepositoryErrorHandler(null);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider>
      <AuthProvider>
        <ThemeApplier />
        <StorageErrorReporter />
        <RepositoryErrorReporter />
        {children}
        <Toaster />
      </AuthProvider>
    </TooltipProvider>
  );
}
