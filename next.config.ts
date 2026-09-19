import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't walk up to the
  // home directory looking for a lockfile (OneDrive/Desktop nesting).
  turbopack: { root: __dirname },

  // Friendly aliases → the real page.
  async redirects() {
    return [
      { source: "/template", destination: "/templates", permanent: false },
      { source: "/register", destination: "/signup", permanent: false },
      { source: "/staff-login", destination: "/login/staff", permanent: false },
    ];
  },
};

export default nextConfig;
