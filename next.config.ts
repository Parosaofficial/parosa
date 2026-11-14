import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so Next doesn't walk up to the
  // home directory looking for a lockfile (OneDrive/Desktop nesting).
  turbopack: { root: __dirname },

  // Browser security headers on every page and API route.
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },                       // no one can frame Parosa (click-jacking)
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=(), geolocation=(self)" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        // Report-only for now: lists what pages may load and logs anything else in the
        // browser console. Switch to "Content-Security-Policy" once nothing is reported.
        { key: "Content-Security-Policy-Report-Only", value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' data: https://fonts.gstatic.com",
          "img-src 'self' data: blob: https:",
          "media-src 'self' data: blob:",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
          "frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; ") },
      ],
    }];
  },

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
