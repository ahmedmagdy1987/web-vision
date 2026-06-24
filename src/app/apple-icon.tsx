import { ImageResponse } from "next/og";

// TEMPORARY Malahi placeholder — a plain brand-teal tile (no invented symbol, no
// text/font dependency). The official Malahi logo asset is required: drop it at
// public/malahi-logo.svg and regenerate this icon.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#0d9488", display: "flex" }} />,
    { ...size },
  );
}
