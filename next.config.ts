import type { NextConfig } from "next";

// Security headers. The CSP is intentionally strict but compatible with:
//  - Next.js App Router inline hydration bootstrap + styled-jsx / next/font
//    inline styles (require 'unsafe-inline' since there is no per-request nonce;
//    'unsafe-eval' is dev-only for React Refresh).
//  - Supabase over https (auth/REST/storage) AND wss (Realtime) in connect-src.
//  - Signed private-Storage images (https Supabase host) + data:/blob: images
//    (placeholder SVGs, data-URL uploads, object-URL downloads).
// frame-ancestors 'none' + X-Frame-Options: DENY prevent clickjacking; the
// Supabase session cookie is JS-readable by design (@supabase/ssr), so CSP is the
// primary XSS-token-theft mitigation.
const isProd = process.env.NODE_ENV === "production";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
let supabaseWss = "";
try {
  if (supabaseUrl) supabaseWss = `wss://${new URL(supabaseUrl).host}`;
} catch {
  supabaseWss = "";
}

const csp = [
  `default-src 'self'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `object-src 'none'`,
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data: blob:${supabaseUrl ? ` ${supabaseUrl}` : ""}`,
  `font-src 'self' data:`,
  `connect-src 'self'${supabaseUrl ? ` ${supabaseUrl} ${supabaseWss}` : ""}`,
  `worker-src 'self' blob:`,
  `manifest-src 'self'`,
  ...(isProd ? [`upgrade-insecure-requests`] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  // Hide the framework/version fingerprint.
  poweredByHeader: false,
  // User-uploaded assets are stored as data URLs / signed Storage URLs and
  // rendered through the AssetImage wrapper (plain <img>), so next/image
  // remote/optimization config is intentionally minimal.
  images: {
    qualities: [60, 75, 90, 100],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Authenticated/dynamic API responses must never be cached by any
      // intermediary. (The download route also sets its own private no-store.)
      { source: "/api/:path*", headers: [{ key: "Cache-Control", value: "no-store, max-age=0" }] },
    ];
  },
};

export default nextConfig;
