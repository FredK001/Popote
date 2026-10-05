import type { CategoryTone } from "@/components/ui/CategoryChip";

export type Difficulty = 1 | 2 | 3;

export type Ingredient = {
  id: string;
  position: number;
  quantity: number | null;
  unit: string | null;
  name: string;
  ingredient_key: string | null;
  aisle?: string | null;
};

export type Step = {
  id: string;
  position: number;
  text: string;
  timer_seconds: number | null;
};

export type Recipe = {
  id: string;
  author_id: string;
  title: string;
  description: string | null;
  servings: number;
  prep_minutes: number | null;
  cook_minutes: number | null;
  difficulty: Difficulty | null;
  photo_path: string | null;
  source_url: string | null;
  origin_label: string | null;
  origin_year: number | null;
  tags: string[];
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type RecipeWithDetails = Recipe & {
  recipe_ingredients: Ingredient[];
  recipe_steps: Step[];
  author: { id: string; first_name: string; avatar_color: CategoryTone | "bleu-nuit" } | null;
};

export type NotebookEntry = {
  user_id: string;
  recipe_id: string;
  category_id: string | null;
  personal_note: string | null;
  quantity_overrides: Record<string, number>;
  added_at: string;
  last_opened_at: string | null;
};

export type Category = {
  id: string;
  user_id: string | null;
  default_key: string | null;
  name: string | null;
  color_token: CategoryTone;
  icon_key: string;
  position: number;
};

export type Profile = {
  id: string;
  first_name: string;
  avatar_url: string | null;
  avatar_color: ProfileColor;
  notebook_name: string | null;
  notebook_color: ProfileColor;
  onboarded_at: string | null;
};

export type ProfileColor = "encre" | "tomate" | "sauge" | "prune" | "laiton" | "abricot" | "bleu-nuit";

/** Total time shown on cards: preparation + cooking. */
export function totalMinutes(recipe: Pick<Recipe, "prep_minutes" | "cook_minutes">): number | null {
  const total = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  return total > 0 ? total : null;
}
