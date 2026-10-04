"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const id = z.string().min(1).max(200);

async function decide(formData: FormData, approve: boolean) {
  const authorizationId = id.parse(formData.get("authorization_id"));
  const supabase = await createClient();
  const { data, error } = approve
    ? await supabase.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (error || !data?.redirect_url) redirect(`/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}&erreur=1`);
  // Back to the OAuth client (Claude, ChatGPT) with the code, or with access_denied.
  redirect(data.redirect_url);
}

export async function approve(formData: FormData) {
  await decide(formData, true);
}

export async function deny(formData: FormData) {
  await decide(formData, false);
}
