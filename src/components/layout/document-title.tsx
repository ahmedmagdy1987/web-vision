"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

// Per-route document titles for the (client-rendered) application routes. Auth
// pages set their own titles via server metadata.
const TITLES: Record<string, string> = {
  "/": "Generate",
  "/gallery": "Gallery",
  "/identity": "Logos",
  "/products": "Products",
  "/locations": "Locations",
};

export function DocumentTitle() {
  const pathname = usePathname();
  React.useEffect(() => {
    const key = pathname.startsWith("/gallery/") ? "/gallery" : pathname;
    const label = TITLES[key];
    document.title = label ? `${label} — Malahi` : "Malahi · Mockup Studio";
  }, [pathname]);
  return null;
}
