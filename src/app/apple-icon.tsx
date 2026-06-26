import { ImageResponse } from "next/og";

// Neutral brand-teal app-icon. The official Malahi logo (public/malahi-logo.png)
// is a WIDE lockup that cannot be squared into an app icon without cropping or
// distorting it, so a clean neutral tile is used here. A dedicated square
// official-icon version of the Malahi logo is still needed.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", background: "#0d9488", display: "flex" }} />,
    { ...size },
  );
}
