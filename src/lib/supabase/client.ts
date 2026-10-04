import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

/** Supabase client for Client Components (anon key, user session from cookies). */
export function createClient() {
  return createBrowserClient(publicEnv.supabaseUrl(), publicEnv.supabaseAnonKey());
}
