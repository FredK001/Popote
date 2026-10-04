import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPage } from "@/lib/fetch-page";
import { importRecipePhoto } from "@/lib/import-photo";
import { findRecipeNode, recipeImageUrl } from "./jsonld";

export { sourcePageUrl } from "./source-url";

/** Reads the source page and copies its dish photo into the user's folder. Null when anything fails. */
export async function photoFromSourcePage(userId: string, pageUrl: string, client?: SupabaseClient): Promise<string | null> {
  try {
    const page = await fetchPage(pageUrl);
    const imageUrl = recipeImageUrl(page.html, findRecipeNode(page.html), page.url);
    return imageUrl ? await importRecipePhoto(userId, imageUrl, client) : null;
  } catch {
    return null;
  }
}
