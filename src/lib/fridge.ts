import { FAMILIES, isIngredientKey, type IngredientKey } from "@/lib/recipes/ingredient-catalog";
import { guessIngredientKey } from "@/lib/recipes/ingredient-picto";

export type FridgeRecipe = {
  id: string;
  title: string;
  photo_path: string | null;
  /** Null for the user's own recipes. */
  author_first_name: string | null;
  in_notebook: boolean;
  ingredients: { name: string; ingredient_key: string | null }[];
};

export type FridgeMatch = { recipe: FridgeRecipe; have: string[]; missing: string[] };

/** Always in the cupboard: never counted as missing. */
const STAPLES = new Set<IngredientKey>(["sel", "poivre", "huile"]);
const STAPLE_WORDS = new Set(["eau", "eau chaude", "eau froide"]);
/** Family keys are too broad to match on ("légume" for both poireau and brocoli). */
const GENERIC = new Set<string>(FAMILIES);

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/\s+/g, " ").trim();
const singular = (s: string) => s.replace(/(s|x)$/u, "");

function keyOf(name: string, key: string | null): IngredientKey | null {
  return isIngredientKey(key) ? key : guessIngredientKey(name);
}

/** Splits "œufs, lait et 2 courgettes" into items. */
export function parseFridgeInput(input: string): string[] {
  return input
    .split(/[,;\n]| et /u)
    .map((s) => s.replace(/^\s*[\d.,½¼¾]+\s*(g|kg|ml|cl|l)?\s+(de |d')?/iu, "").trim())
    .filter((s) => s.length >= 2)
    .slice(0, 30);
}

/**
 * Recipes the user can make with what they have: those that use at least one of
 * the items, fewest missing ingredients first, then most items used.
 */
export function matchFridge(have: string[], recipes: FridgeRecipe[], limit = 10): FridgeMatch[] {
  const items = have
    .map((h) => ({ text: singular(norm(h)), key: guessIngredientKey(h) }))
    .filter((h) => h.text.length >= 2);
  if (items.length === 0) return [];

  const matches: FridgeMatch[] = [];
  for (const recipe of recipes) {
    const got: string[] = [];
    const missing: string[] = [];
    for (const ing of recipe.ingredients) {
      const key = keyOf(ing.name, ing.ingredient_key);
      const name = norm(ing.name);
      if ((key && STAPLES.has(key)) || STAPLE_WORDS.has(name)) continue;
      const found = items.some(
        (h) => (key && !GENERIC.has(key) && h.key === key) || ` ${name} `.includes(` ${h.text}`),
      );
      (found ? got : missing).push(ing.name);
    }
    if (got.length > 0) matches.push({ recipe, have: got, missing });
  }
  return matches
    .sort((a, b) => a.missing.length - b.missing.length || b.have.length - a.have.length || a.recipe.title.localeCompare(b.recipe.title, "fr"))
    .slice(0, limit);
}
