import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Category, Ingredient, NotebookEntry, ProfileColor, Recipe, Step } from "./types";

export type NotebookItem = {
  recipeId: string;
  title: string;
  photoPath: string | null;
  totalMinutes: number | null;
  categoryId: string | null;
  authorId: string;
  authorName: string | null;
  senderName: string | null;
  lastOpenedAt: string | null;
  addedAt: string;
};

type EntryRow = {
  recipe_id: string;
  category_id: string | null;
  last_opened_at: string | null;
  added_at: string;
  sender: { first_name: string } | null;
  recipe: {
    id: string;
    title: string;
    photo_path: string | null;
    prep_minutes: number | null;
    cook_minutes: number | null;
    author_id: string;
    author: { first_name: string } | null;
  } | null;
};

/** The user's notebook, newest first. RLS limits it to their own entries. */
export async function getNotebook(): Promise<NotebookItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notebook_entries")
    .select(
      "recipe_id, category_id, last_opened_at, added_at, sender:profiles!notebook_entries_received_from_fkey(first_name), recipe:recipes(id, title, photo_path, prep_minutes, cook_minutes, author_id, author:profiles!recipes_author_id_fkey(first_name))",
    )
    .order("added_at", { ascending: false })
    .returns<EntryRow[]>();
  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.recipe)
    .map((row) => {
      const r = row.recipe!;
      const total = (r.prep_minutes ?? 0) + (r.cook_minutes ?? 0);
      return {
        recipeId: r.id,
        title: r.title,
        photoPath: r.photo_path,
        totalMinutes: total > 0 ? total : null,
        categoryId: row.category_id,
        authorId: r.author_id,
        authorName: r.author?.first_name ?? null,
        senderName: row.sender?.first_name ?? null,
        lastOpenedAt: row.last_opened_at,
        addedAt: row.added_at,
      };
    });
}

/** Default categories plus the user's own, in display order. */
export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, user_id, default_key, name, color_token, icon_key, position")
    .order("user_id", { ascending: true, nullsFirst: true })
    .order("position")
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as Category[];
});

export type RecipeSheet = {
  recipe: Recipe;
  ingredients: Ingredient[];
  steps: Step[];
  author: { id: string; first_name: string; avatar_color: ProfileColor; avatar_url: string | null } | null;
  entry: Pick<NotebookEntry, "category_id" | "personal_note" | "quantity_overrides" | "last_opened_at"> | null;
};

/** A recipe with its ingredients, steps and the user's notebook entry. Null when not readable. */
export const getRecipeSheet = cache(async (recipeId: string, userId: string): Promise<RecipeSheet | null> => {
  const supabase = await createClient();
  const [{ data: recipe }, { data: entry }] = await Promise.all([
    supabase
      .from("recipes")
      .select(
        "*, recipe_ingredients(id, position, quantity, unit, name, ingredient_key), recipe_steps(id, position, text, timer_seconds), author:profiles!recipes_author_id_fkey(id, first_name, avatar_color, avatar_url)",
      )
      .eq("id", recipeId)
      .maybeSingle(),
    supabase
      .from("notebook_entries")
      .select("category_id, personal_note, quantity_overrides, last_opened_at")
      .eq("recipe_id", recipeId)
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (!recipe) return null;

  const { recipe_ingredients, recipe_steps, author, ...rest } = recipe as Recipe & {
    recipe_ingredients: Ingredient[];
    recipe_steps: Step[];
    author: RecipeSheet["author"];
  };

  return {
    recipe: rest,
    ingredients: [...recipe_ingredients].sort((a, b) => a.position - b.position).map(normalizeIngredient),
    steps: [...recipe_steps].sort((a, b) => a.position - b.position),
    author,
    entry: entry
      ? { ...entry, quantity_overrides: (entry.quantity_overrides ?? {}) as Record<string, number> }
      : null,
  };
});

/** numeric columns come back as strings from PostgREST when large; normalise to numbers. */
function normalizeIngredient(i: Ingredient): Ingredient {
  return { ...i, quantity: i.quantity == null ? null : Number(i.quantity) };
}
