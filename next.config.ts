import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "dlyxwupqucwiglrdrnho.supabase.co";

const nextConfig: NextConfig = {
  images: {
    // Recipe photos live in Supabase Storage public buckets.
    remotePatterns: [{ protocol: "https", hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
