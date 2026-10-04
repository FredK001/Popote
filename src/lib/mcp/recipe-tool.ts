import { z } from "zod";
import { recipeDraft, sanitizeDraft } from "@/lib/ai/schema";
import { draftToRecipeInput } from "@/lib/ai/to-recipe";
import { recipeInput, type RecipeData } from "@/lib/recipes/schema";
import type { Category } from "@/lib/recipes/types";

/**
 * What the MCP "create recipe" tool accepts: the same draft schema as the in-app
 * AI (fields with confidence and alternatives), minus what only makes sense inside
 * Popote (questions, photo index, readability problem).
 */
export const mcpRecipeInput = recipeDraft
  .omit({ questions: true, dish_photo_index: true, problem: true })
  .extend({
    category_id: z
      .string()
      .nullable()
      .describe("Id of one of the user's categories (from popote_list_categories), or null."),
  });

export type McpRecipeInput = z.infer<typeof mcpRecipeInput>;

/** Validates the model's recipe and turns it into what save_recipe() expects. Null when unusable. */
export function mcpToRecipeData(input: unknown, categories: Pick<Category, "id" | "default_key">[]): RecipeData | null {
  const parsed = mcpRecipeInput.safeParse(input);
  if (!parsed.success) return null;
  const { category_id, ...draft } = parsed.data;
  const clean = sanitizeDraft({ ...draft, questions: [], dish_photo_index: null, problem: "none" });
  if (!clean) return null;

  const base = draftToRecipeInput(clean, { categories });
  // An explicit category wins, but only one of the user's own (or a default).
  const categoryId = category_id && categories.some((c) => c.id === category_id) ? category_id : base.category_id;
  const result = recipeInput.safeParse({ ...base, category_id: categoryId });
  return result.success ? result.data : null;
}
