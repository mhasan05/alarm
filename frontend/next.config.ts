import type { NextConfig } from "next";

// Baseline security headers. A strict Content-Security-Policy is added with the backend, once the
// API origin and asset hosts are known.
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(), payment=(), usb=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Keep the dev indicator clear of the portal sidebar's user card (bottom-left).
  devIndicators: { position: "bottom-right" },
  // Role homes were renamed to "dashboard".
  async redirects() {
    return [
      { source: "/politician/profile", destination: "/politician/dashboard", permanent: true },
      { source: "/staff/work", destination: "/staff/dashboard", permanent: true },
      // Submission pages moved under "সব জমা".
      { source: "/admin/field-reports/:code", destination: "/admin/submissions/:code", permanent: true },
    ];
  },
};

export default nextConfig;
