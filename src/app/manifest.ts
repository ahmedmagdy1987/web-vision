import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Malahi — Mockup Generator",
    short_name: "Malahi",
    description: "Internal Malahi tool for creating realistic product-placement mockups.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0b0f",
    theme_color: "#0d9488",
    // Square icons derived from the official Malahi logo (public/malahi-logo.png).
    icons: [
      { src: "/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
    ],
  };
}
