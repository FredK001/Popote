import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// TEMPORARY deployment diagnostic: reports which env vars are set (never their values)
// and the error raised by the server Supabase client. Remove once Netlify is fixed.
export async function GET() {
  const vars = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SITE_URL"];
  const env = Object.fromEntries(vars.map((v) => [v, Boolean(process.env[v])]));
  let client = "ok";
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getClaims();
    if (error) client = `getClaims error: ${error.message}`;
  } catch (e) {
    client = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  }
  return NextResponse.json({ env, client, node: process.version });
}
