import "server-only";
import { randomBytes } from "node:crypto";
import { cache } from "react";
import type { GenealogyRow } from "@/lib/recipes/genealogy";
import type { Ingredient, ProfileColor, Recipe, Step } from "@/lib/recipes/types";
import { isShareToken } from "@/lib/share-token";
import { createAdminClient } from "@/lib/supabase/admin";

/** 128 random bits, URL-safe: not guessable, short enough for a chat message. */
export function newShareToken(): string {
  return randomBytes(16).toString("base64url");
}


export type PublicShare = {
  token: string;
  message: string | null;
  createdAt: string;
  sender: { id: string; firstName: string; color: ProfileColor; photoUrl: string | null };
  recipe: Pick<
    Recipe,
    "id" | "author_id" | "title" | "description" | "servings" | "prep_minutes" | "cook_minutes" | "difficulty" | "photo_path" | "origin_label" | "origin_year" | "source_url"
  >;
  ingredients: Ingredient[];
  steps: Step[];
  lineage: GenealogyRow[];
  adopted: number;
};

/**
 * Everything the public /r/[token] page shows, read with the service role.
 * Only this recipe, its sender's first name/avatar and the first names along its
 * path are exposed. Returns null for unknown tokens or deleted recipes.
 */
export const getPublicShare = cache(async (token: string): Promise<PublicShare | null> => {
  if (!isShareToken(token)) return null;
  const admin = createAdminClient();

  const { data: share } = await admin
    .from("shares")
    .select(
      "token, message, created_at, sender:profiles!shares_sender_id_fkey(id, first_name, avatar_color, avatar_url), recipe:recipes(id, author_id, title, description, servings, prep_minutes, cook_minutes, difficulty, photo_path, origin_label, origin_year, source_url, deleted_at, recipe_ingredients(id, position, quantity, unit, name, ingredient_key), recipe_steps(id, position, text, timer_seconds))",
    )
    .eq("token", token)
    .maybeSingle();

  type Row = {
    token: string;
    message: string | null;
    created_at: string;
    sender: { id: string; first_name: string; avatar_color: ProfileColor; avatar_url: string | null } | null;
    recipe: (PublicShare["recipe"] & { deleted_at: string | null; recipe_ingredients: Ingredient[]; recipe_steps: Step[] }) | null;
  };
  const row = share as Row | null;
  if (!row?.recipe || !row.sender || row.recipe.deleted_at) return null;

  const [{ data: lineage }, { data: reach }] = await Promise.all([
    admin.rpc("recipe_genealogy", { p_recipe_id: row.recipe.id, p_from_user: row.sender.id }),
    admin.rpc("recipe_reach", { p_recipe_id: row.recipe.id }),
  ]);

  const { recipe_ingredients, recipe_steps, deleted_at: _deleted, ...recipe } = row.recipe;
  void _deleted;

  return {
    token: row.token,
    message: row.message,
    createdAt: row.created_at,
    sender: {
      id: row.sender.id,
      firstName: row.sender.first_name,
      color: row.sender.avatar_color,
      photoUrl: row.sender.avatar_url,
    },
    recipe,
    ingredients: [...recipe_ingredients]
      .sort((a, b) => a.position - b.position)
      .map((i) => ({ ...i, quantity: i.quantity == null ? null : Number(i.quantity) })),
    steps: [...recipe_steps].sort((a, b) => a.position - b.position),
    lineage: (lineage ?? []) as GenealogyRow[],
    adopted: (reach as Array<{ adopted: number }> | null)?.[0]?.adopted ?? 0,
  };
});
