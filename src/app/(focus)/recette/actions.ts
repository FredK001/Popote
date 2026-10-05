"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { getUserId } from "@/lib/auth";
import { notifyFriendPublished, notifyRecipeVariant } from "@/lib/notify";
import { guessIngredientKey } from "@/lib/recipes/ingredient-picto";
import { recipeInput, type RecipeInput } from "@/lib/recipes/schema";
import { newShareToken } from "@/lib/shares";
import { siteOrigin } from "@/lib/site-url";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

export type ActionResult = { error?: string; ok?: boolean };

/** Creates or updates a recipe (with ingredients and steps) atomically, then opens it. */
export async function saveRecipe(input: RecipeInput): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId) redirect("/connexion");

  const parsed = recipeInput.safeParse(input);
  if (!parsed.success) return { error: t.recipeForm.errorInvalid };
  const data = parsed.data;
  if (data.ingredients.length === 0) return { error: t.recipeForm.errorIngredients };
  if (data.steps.length === 0) return { error: t.recipeForm.errorSteps };
  if (data.photo_path && !data.photo_path.startsWith(`${userId}/`)) return { error: t.recipeForm.errorInvalid };

  const supabase = await createClient();
  const { data: recipeId, error } = await supabase.rpc("save_recipe", {
    p_recipe: {
      id: data.id,
      title: data.title,
      description: data.description,
      servings: data.servings,
      prep_minutes: data.prep_minutes,
      cook_minutes: data.cook_minutes,
      difficulty: data.difficulty,
      photo_path: data.photo_path,
      source_url: data.source_url,
      origin_label: data.origin_label,
      origin_year: data.origin_year,
      tags: [],
    },
    p_ingredients: data.ingredients.map((i) => ({
      ...i,
      ingredient_key: i.ingredient_key ?? guessIngredientKey(i.name),
    })),
    p_steps: data.steps,
    p_category_id: data.category_id,
  });
  if (error || !recipeId) return { error: t.errors.generic };

  // A variant: link it to its source (a trigger checks the source is readable).
  let variantSourceAuthor: string | null = null;
  if (!data.id && data.variant_of) {
    const [{ error: linkError }, { data: source }] = await Promise.all([
      supabase.from("recipes").update({ variant_of: data.variant_of }).eq("id", recipeId),
      supabase.from("recipes").select("author_id").eq("id", data.variant_of).maybeSingle(),
    ]);
    if (!linkError) variantSourceAuthor = source?.author_id ?? null;
  }

  // A new recipe: tell the author's friends (and the original's author), after the response.
  if (!data.id) {
    after(async () => {
      await notifyFriendPublished(userId, recipeId as string, data.title);
      if (variantSourceAuthor) await notifyRecipeVariant(variantSourceAuthor, userId, recipeId as string, data.title);
    });
  }

  revalidatePath("/carnet");
  revalidatePath(`/recette/${recipeId}`);
  redirect(`/recette/${recipeId}`);
}

const uuid = z.uuid();

/** Soft-deletes the user's own recipe and removes it from their notebook. Others keep it. */
export async function deleteRecipe(recipeId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success) return { error: t.errors.generic };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", recipeId)
    .eq("author_id", userId);
  if (error) return { error: t.errors.generic };
  await supabase.from("notebook_entries").delete().eq("recipe_id", recipeId).eq("user_id", userId);

  revalidatePath("/carnet");
  redirect("/carnet");
}

/** Removes a received recipe from the notebook (the recipe itself stays). */
export async function removeFromNotebook(recipeId: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success) return { error: t.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase.from("notebook_entries").delete().eq("recipe_id", recipeId).eq("user_id", userId);
  if (error) return { error: t.errors.generic };
  revalidatePath("/carnet");
  redirect("/carnet");
}

/** Personal note, visible only to the user. */
export async function saveNote(recipeId: string, note: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success) return { error: t.errors.generic };
  const text = note.trim().slice(0, 2000);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notebook_entries")
    .update({ personal_note: text || null })
    .eq("recipe_id", recipeId)
    .eq("user_id", userId);
  if (error) return { error: t.errors.generic };
  revalidatePath(`/recette/${recipeId}`);
  return { ok: true };
}

const overridesSchema = z.record(z.uuid(), z.number().positive().max(100000));

/** "Ma version": the user's own quantities, per ingredient id, for the base servings. */
export async function saveOverrides(recipeId: string, overrides: Record<string, number>): Promise<ActionResult> {
  const userId = await getUserId();
  const parsed = overridesSchema.safeParse(overrides);
  if (!userId || !uuid.safeParse(recipeId).success || !parsed.success) return { error: t.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase
    .from("notebook_entries")
    .update({ quantity_overrides: parsed.data })
    .eq("recipe_id", recipeId)
    .eq("user_id", userId);
  if (error) return { error: t.errors.generic };
  revalidatePath(`/recette/${recipeId}`);
  return { ok: true };
}

export type ShareResult = { error?: string; url?: string };

/** Creates a share link (with an optional message) for a recipe the user can read. */
export async function createShare(recipeId: string, message: string): Promise<ShareResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success) return { error: t.share.error };

  const supabase = await createClient();
  const token = newShareToken();
  const { error } = await supabase.from("shares").insert({
    token,
    recipe_id: recipeId,
    sender_id: userId,
    message: message.trim().slice(0, 500) || null,
  });
  if (error) return { error: t.share.error };

  return { url: `${await siteOrigin()}/r/${token}` };
}

/** Sets the dish photo of the user's own recipe (after an MCP or AI import). */
export async function setRecipePhoto(recipeId: string, photoPath: string): Promise<ActionResult> {
  const userId = await getUserId();
  if (!userId || !uuid.safeParse(recipeId).success || !photoPath.startsWith(`${userId}/`)) return { error: t.errors.generic };
  const supabase = await createClient();
  const { error } = await supabase
    .from("recipes")
    .update({ photo_path: photoPath })
    .eq("id", recipeId)
    .eq("author_id", userId);
  if (error) return { error: t.errors.generic };
  revalidatePath(`/recette/${recipeId}`);
  revalidatePath("/carnet");
  return { ok: true };
}
