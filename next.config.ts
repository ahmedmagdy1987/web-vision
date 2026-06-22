import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // User-uploaded assets are stored as data URLs and rendered through the
  // AssetImage wrapper (plain <img>), so next/image remote/optimization config
  // is intentionally minimal. Add remotePatterns here when a real asset host
  // is introduced in a later phase.
  images: {
    qualities: [60, 75, 90, 100],
  },
};

export default nextConfig;
