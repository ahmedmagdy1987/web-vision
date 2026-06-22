"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** Re-mounts on route change to replay a subtle enter animation. */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page-in">
      {children}
    </div>
  );
}
