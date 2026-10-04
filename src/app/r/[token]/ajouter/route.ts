import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { requestOrigin } from "@/lib/request-origin";
import { claimPath, isShareToken } from "@/lib/share-token";
import { createClient } from "@/lib/supabase/server";

/**
 * "Ajouter à mon carnet". This URL is the pending action: it travels as ?next=
 * through the login (inside the e-mail link, the code form or Google's redirect)
 * and onboarding, so the recipe gets added even if sign-up happens in another tab.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[token]/ajouter">) {
  const { token } = await params;
  const origin = requestOrigin(request);
  if (!isShareToken(token)) return NextResponse.redirect(new URL("/carnet", origin));

  const here = claimPath(token);
  const profile = await getProfile();
  if (!profile) return NextResponse.redirect(new URL(`/connexion?next=${encodeURIComponent(here)}`, origin));
  if (!profile.onboarded_at) return NextResponse.redirect(new URL(`/bienvenue?next=${encodeURIComponent(here)}`, origin));

  const supabase = await createClient();
  const { data: recipeId, error } = await supabase.rpc("claim_share", { p_token: token });
  if (error || !recipeId) return NextResponse.redirect(new URL(`/r/${token}`, origin));

  return NextResponse.redirect(new URL(`/recette/${recipeId}?ajoutee=1`, origin));
}
