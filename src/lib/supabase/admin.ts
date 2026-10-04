import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv, requireEnv } from "@/lib/env";

/**
 * Service-role client: bypasses RLS. Server only, for narrow tasks
 * (public share page, quota). Never pass its results to the client unfiltered.
 */
export function createAdminClient() {
  return createClient(
    publicEnv.supabaseUrl(),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
