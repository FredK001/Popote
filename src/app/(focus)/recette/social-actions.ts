"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { notifyRecipeCooked } from "@/lib/notify";
import { getRecipeSheet } from "@/lib/recipes/queries";
import { linesForRecipe, mergeLines } from "@/lib/shopping";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";
import type { ActionResult } from "./actions";

const uuid = z.uuid();

/** "Je l'ai faite !": logs the cook (with an optional photo and note) and tells the author. */
export async function markCooked(recipeId: string, photoPath: string | null, note: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success) return { error: t.errors.generic };
  if (photoPath && !photoPath.startsWith(`${userId}/`)) return { error: t.errors.generic };

  const supabase = await createClient();
  const [{ error }, { data: recipe }] = await Promise.all([
    supabase.from("cooks").insert({ user_id: userId, recipe_id: recipeId, photo_path: photoPath, note: note.trim().slice(0, 280) || null }),
    supabase.from("recipes").select("author_id, title").eq("id", recipeId).maybeSingle(),
  ]);
  if (error) return { error: t.errors.generic };

  if (recipe) after(() => notifyRecipeCooked(recipe.author_id, userId, recipeId, recipe.title));
  revalidatePath(`/recette/${recipeId}`);
  revalidatePath("/copains");
  return { ok: true };
}

/** Removes one of the user's own cooks. */
export async function removeCook(cookId: string, recipeId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(cookId).success) return { error: t.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.from("cooks").delete().eq("id", cookId).eq("user_id", userId);
  if (error) return { error: t.errors.generic };
  revalidatePath(`/recette/${recipeId}`);
  return { ok: true };
}

/** Adds the recipe's ingredients, for the chosen servings and the user's quantities, to the list. */
export async function addRecipeToShoppingList(recipeId: string, servings: number): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success || !Number.isInteger(servings) || servings < 1 || servings > 50) {
    return { error: t.errors.generic };
  }
  const supabase = await createClient();
  const [sheet, { data: existing }] = await Promise.all([
    getRecipeSheet(recipeId, userId),
    supabase.from("shopping_items").select("id, name, unit, quantity, checked"),
  ]);
  if (!sheet) return { error: t.errors.generic };

  const lines = linesForRecipe(sheet.ingredients, sheet.recipe.servings, servings, sheet.entry?.quantity_overrides);
  const { updates, inserts } = mergeLines(existing ?? [], lines);
  const results = await Promise.all([
    inserts.length
      ? supabase.from("shopping_items").insert(inserts.map((line) => ({ ...line, user_id: userId, recipe_id: recipeId })))
      : Promise.resolve({ error: null }),
    ...updates.map((u) => supabase.from("shopping_items").update({ quantity: u.quantity }).eq("id", u.id)),
  ]);
  if (results.some((r) => r.error)) return { error: t.errors.generic };

  revalidatePath("/courses");
  return { ok: true };
}
