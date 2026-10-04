import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchPage } from "@/lib/fetch-page";
import { importRecipePhoto } from "@/lib/import-photo";
import { findRecipeNode, recipeImageUrl } from "./jsonld";

/**
 * The web page a recipe comes from: its source URL, or an address written in the
 * origin ("Konbini — konbini.com/food/…"), as AI assistants often put it there.
 */
export function sourcePageUrl(sourceUrl: string | null | undefined, originLabel: string | null | undefined): string | null {
  if (sourceUrl && /^https?:\/\//.test(sourceUrl)) return sourceUrl;
  const match = originLabel?.match(/(https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;)]*)?)/i);
  if (!match) return null;
  return match[1] ? match[0] : `https://${match[2]}`;
}

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
