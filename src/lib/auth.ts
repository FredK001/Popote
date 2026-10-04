import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import type { Profile } from "@/lib/recipes/types";
import { createClient } from "@/lib/supabase/server";

/** Signed-in user id, or null. Verified claims, cached per request. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

export const getProfile = cache(async (): Promise<Profile | null> => {
  const userId = await getUserId();
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, avatar_url, avatar_color, notebook_name, notebook_color, onboarded_at")
    .eq("id", userId)
    .single();
  return (data as Profile | null) ?? null;
});

/** For pages of the app: signed in and onboarded, or redirected. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  if (!profile.onboarded_at) redirect("/bienvenue");
  return profile;
}
