import { ImageResponse } from "next/og";

// Apple touch icon, generated to match the Malahi brand mark (ferris-wheel motif
// on the brand accent). No text → no font dependency.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d9488",
        }}
      >
        <svg
          width="118"
          height="118"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="10" r="6.7" />
          <path d="M12 10V3.3M12 10h6.7M12 10v6.7M12 10H5.3M12 10l4.74-4.74M12 10l4.74 4.74M12 10l-4.74 4.74M12 10L7.26 5.26" />
          <circle cx="12" cy="10" r="1.5" fill="#ffffff" stroke="none" />
          <path d="M7.8 16.2 12 11.4l4.2 4.8" />
          <path d="M6.2 19.4h11.6" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
