import { AISLES, aisleFor, isIngredientKey, type Aisle } from "@/lib/recipes/ingredient-catalog";
import { guessIngredientKey } from "@/lib/recipes/ingredient-picto";
import { scaleQuantity } from "@/lib/recipes/quantities";
import type { Ingredient } from "@/lib/recipes/types";

export type ShoppingLine = {
  name: string;
  quantity: number | null;
  unit: string | null;
  ingredient_key: string | null;
  aisle: Aisle;
};

export type ShoppingItem = ShoppingLine & { id: string; recipe_id: string | null; checked: boolean };

function isAisle(value: unknown): value is Aisle {
  return typeof value === "string" && (AISLES as readonly string[]).includes(value);
}

/** Aisle of an ingredient: the one stored with it, else the catalog's, else "autre". */
export function aisleOf(ing: Pick<Ingredient, "name" | "ingredient_key" | "aisle">): Aisle {
  if (isAisle(ing.aisle)) return ing.aisle;
  const key = isIngredientKey(ing.ingredient_key) ? ing.ingredient_key : guessIngredientKey(ing.name);
  return key ? aisleFor(key) : "autre";
}

/** Shopping lines for a recipe at the chosen servings, with the user's own quantities. */
export function linesForRecipe(
  ingredients: Ingredient[],
  baseServings: number,
  servings: number,
  overrides: Record<string, number> = {},
): ShoppingLine[] {
  return ingredients.map((ing) => {
    const base = overrides[ing.id] ?? ing.quantity;
    return {
      name: ing.name.trim(),
      quantity: base == null ? null : scaleQuantity(base, ing.unit, baseServings, servings),
      unit: ing.unit?.trim() || null,
      ingredient_key: ing.ingredient_key,
      aisle: aisleOf(ing),
    };
  });
}

const norm = (s: string | null) => (s ?? "").trim().toLowerCase();

/**
 * Merges new lines into the unchecked items already on the list: same name and unit
 * add up ("200 g de farine" + "100 g de farine" → "300 g"). Returns the updates to
 * existing items and the lines to insert.
 */
export function mergeLines(
  existing: Pick<ShoppingItem, "id" | "name" | "unit" | "quantity" | "checked">[],
  lines: ShoppingLine[],
): { updates: { id: string; quantity: number | null }[]; inserts: ShoppingLine[] } {
  const open = new Map<string, { id: string; quantity: number | null }>();
  for (const item of existing) {
    if (!item.checked) open.set(`${norm(item.name)}|${norm(item.unit)}`, { id: item.id, quantity: item.quantity == null ? null : Number(item.quantity) });
  }
  const updates = new Map<string, number | null>();
  const inserts: ShoppingLine[] = [];
  for (const line of lines) {
    const key = `${norm(line.name)}|${norm(line.unit)}`;
    const found = open.get(key);
    if (!found) {
      const fresh = { id: `new-${inserts.length}`, quantity: line.quantity };
      inserts.push(line);
      open.set(key, fresh);
      continue;
    }
    const sum = found.quantity == null || line.quantity == null ? (found.quantity ?? line.quantity) : Math.round((found.quantity + line.quantity) * 1000) / 1000;
    found.quantity = sum;
    if (found.id.startsWith("new-")) inserts[Number(found.id.slice(4))].quantity = sum;
    else updates.set(found.id, sum);
  }
  return { updates: [...updates].map(([id, quantity]) => ({ id, quantity })), inserts };
}

/** Items grouped by aisle, in shop order; checked items last within each aisle. */
export function groupByAisle<T extends { aisle: string; checked: boolean }>(items: T[]): { aisle: Aisle; items: T[] }[] {
  return AISLES.map((aisle) => ({
    aisle,
    items: items.filter((i) => (isAisle(i.aisle) ? i.aisle : "autre") === aisle).sort((a, b) => Number(a.checked) - Number(b.checked)),
  })).filter((g) => g.items.length > 0);
}
