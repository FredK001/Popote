"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { safeNext } from "@/lib/safe-redirect";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

export type LoginState =
  | { step: "form"; error?: string; firstName?: string; email?: string }
  | { step: "sent"; email: string; error?: string };

const emailSchema = z.email();

function rateLimited(status: number | undefined, code: string | undefined) {
  return status === 429 || code === "over_email_send_rate_limit";
}

/** Sends the magic link e-mail (which also carries a 6-digit code). */
export async function sendMagicLink(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const firstName = String(formData.get("first_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(String(formData.get("next") ?? ""));

  if (!firstName) return { step: "form", error: t.auth.errorFirstName, firstName, email };
  if (!emailSchema.safeParse(email).success) return { step: "form", error: t.auth.errorEmail, firstName, email };

  const supabase = await createClient();
  const origin = await siteOrigin();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // The e-mail template appends &token_hash=…&type=email to this URL.
      emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      // Stored on sign-up only; copied into profiles.first_name by a trigger.
      data: { first_name: firstName.slice(0, 50) },
    },
  });

  if (error) {
    return {
      step: "form",
      error: rateLimited(error.status, error.code) ? t.auth.errorRate : t.errors.generic,
      firstName,
      email,
    };
  }
  return { step: "sent", email };
}

/** Fallback when the link opens elsewhere: the user types the 6-digit code. */
export async function verifyCode(prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = prev.step === "sent" ? prev.email : String(formData.get("email") ?? "");
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  const next = safeNext(String(formData.get("next") ?? ""));

  // OTP length is a project setting (6 to 10 digits).
  if (!/^\d{6,10}$/.test(token)) return { step: "sent", email, error: t.auth.errorCode };

  const supabase = await createClient();
  // First sign-in sends the "Confirm signup" e-mail, whose code is of type "signup".
  let { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) ({ error } = await supabase.auth.verifyOtp({ email, token, type: "signup" }));
  if (error) return { step: "sent", email, error: t.auth.errorCode };

  redirect(next);
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(String(formData.get("next") ?? ""));
  const supabase = await createClient();
  const origin = await siteOrigin();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect(`/connexion?erreur=google&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/connexion");
}
