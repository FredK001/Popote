import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { requestOrigin } from "@/lib/request-origin";
import { safeNext } from "@/lib/safe-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Magic link target. Two flows:
 * - token_hash (custom e-mail template, needs custom SMTP): works even when the link
 *   opens in another browser than the one that asked for it (mail apps, iOS PWA);
 * - code (Supabase's default template, PKCE): works only in the same browser.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const origin = requestOrigin(request);
  const tokenHash = searchParams.get("token_hash");
  const code = searchParams.get("code");
  const type = (searchParams.get("type") ?? "email") as EmailOtpType;
  const next = safeNext(searchParams.get("next"));

  const supabase = await createClient();
  if (tokenHash) {
    let { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    // First sign-in comes from the "Confirm signup" e-mail.
    if (error && type === "email") ({ error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "signup" }));
    if (!error) return NextResponse.redirect(new URL(next, origin));
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL(`/connexion?erreur=lien&next=${encodeURIComponent(next)}`, origin));
}
