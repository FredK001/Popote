import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "dlyxwupqucwiglrdrnho.supabase.co";

const nextConfig: NextConfig = {
  // Lets a phone on the same Wi-Fi use the dev server (http://192.168.x.y:3000). Dev only.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "*.local"],
  images: {
    // Recipe photos live in Supabase Storage public buckets.
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
