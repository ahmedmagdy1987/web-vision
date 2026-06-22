"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useResolvedTheme } from "@/lib/theme/use-theme";

function Toaster() {
  const theme = useResolvedTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "rounded-lg border shadow-lg",
        },
      }}
    />
  );
}

export { Toaster };
export { toast } from "sonner";
