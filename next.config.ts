import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't walk up to the
  // home directory looking for a lockfile (OneDrive/Desktop nesting).
  turbopack: { root: __dirname },

  // Friendly aliases → the real page.
  async redirects() {
    return [
      // one menu design for everyone — the old Templates page now lives in Settings
      { source: "/template", destination: "/settings", permanent: false },
      { source: "/templates", destination: "/settings", permanent: false },
      { source: "/register", destination: "/signup", permanent: false },
      { source: "/staff-login", destination: "/login/staff", permanent: false },
      // legal pages live at short links: /terms, /privacy, /delete
      { source: "/terms-and-conditions", destination: "/terms", permanent: true },
      { source: "/term", destination: "/terms", permanent: true },
      { source: "/privacy-policy", destination: "/privacy", permanent: true },
      { source: "/delete-account", destination: "/delete", permanent: true },
      { source: "/account-deletion", destination: "/delete", permanent: true },
    ];
  },
};

export default nextConfig;
