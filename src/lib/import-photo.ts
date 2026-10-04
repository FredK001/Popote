import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { fetchImage } from "@/lib/fetch-page";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Copies a recipe's photo from the source page into the user's storage folder:
 * downloaded with the SSRF guard, resized to 1600 px max and converted to WebP.
 * Returns the storage path, or null when anything fails (the import still works).
 */
export async function importRecipePhoto(
  userId: string,
  imageUrl: string,
  /** Client acting as the user (the MCP connector passes its own; defaults to the cookie session). */
  client?: SupabaseClient,
): Promise<string | null> {
  try {
    const original = await fetchImage(imageUrl);
    const webp = await sharp(original, { failOn: "none" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const path = `${userId}/${randomUUID()}.webp`;
    const supabase = client ?? (await createClient());
    const { error } = await supabase.storage
      .from("recipe-photos")
      .upload(path, webp, { contentType: "image/webp", cacheControl: "31536000" });
    return error ? null : path;
  } catch {
    return null;
  }
}
