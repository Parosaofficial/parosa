import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't walk up to the
  // home directory looking for a lockfile (OneDrive/Desktop nesting).
  turbopack: { root: __dirname },
};

export default nextConfig;
