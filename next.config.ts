import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "dlyxwupqucwiglrdrnho.supabase.co";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi use the dev server (http://192.168.x.y:3000). Dev only.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  experimental: {
    // Revisiting a page within 30 s is instant (mutations still revalidate their paths).
    staleTimes: { dynamic: 30 },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
        ],
      },
      {
        // The service worker must always be revalidated so updates reach installed apps.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  async rewrites() {
    // RFC 9728 metadata for the MCP connector (see src/app/oauth/protected-resource).
    return [
      { source: "/.well-known/oauth-protected-resource", destination: "/oauth/protected-resource" },
      { source: "/.well-known/oauth-protected-resource/mcp", destination: "/oauth/protected-resource" },
    ];
  },
  images: {
    // Recipe photos live in Supabase Storage public buckets.
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
