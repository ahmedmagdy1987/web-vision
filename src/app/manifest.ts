import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Web Vision — Malahi",
    short_name: "Web Vision",
    description: "Internal visual-generation workspace for creating realistic client mockups.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0f",
    theme_color: "#6d28d9",
    icons: [{ src: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
  };
}
