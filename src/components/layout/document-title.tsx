"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Per-route document titles for the (client-rendered) application routes. Auth
// pages set their own titles via server metadata.
const TITLES: Record<string, string> = {
  "/": "Home",
  "/studio": "Studio",
  "/gallery": "Gallery",
  "/identity": "Identity",
  "/products": "Products",
};

export function DocumentTitle() {
  const pathname = usePathname();
  React.useEffect(() => {
    const key = pathname.startsWith("/gallery/") ? "/gallery" : pathname;
    const label = TITLES[key];
    document.title = label ? `${label} — Web Vision` : "Web Vision · Malahi";
  }, [pathname]);
  return null;
}
