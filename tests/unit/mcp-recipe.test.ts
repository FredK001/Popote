import { describe, expect, it } from "vitest";
import { mcpToRecipeData } from "@/lib/mcp/recipe-tool";

const f = <T,>(value: T, confidence: "high" | "low" = "high") => ({ value, confidence, alternatives: [] as T[] });
const categories = [
  { id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", default_key: "starters" },
  { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", default_key: null },
];

const recipe = {
  title: f("Velouté de butternut"),
  description: null,
  servings: f(4),
  prep_minutes: f(15),
  cook_minutes: f(30),
  difficulty: f(1),
  category_key: "starters",
  tags: [],
  origin_label: "Mamie Odette",
  category_id: null,
  ingredients: [
    { quantity: 1, unit: null, name: "courge butternut", ingredient_key: "legume", aisle: "fruits-legumes", confidence: "high", alternatives: [] },
  ],
  steps: [{ text: "Fais cuire.", timer_minutes: 30 }],
};

describe("MCP create recipe", () => {
  it("accepts the shared draft schema and files it by category key", () => {
    const data = mcpToRecipeData(recipe, categories)!;
    expect(data).toMatchObject({ title: "Velouté de butternut", servings: 4, category_id: categories[0].id, origin_label: "Mamie Odette" });
    expect(data.steps[0].timer_seconds).toBe(1800);
  });

  it("uses an explicit category id only when it belongs to the user", () => {
    expect(mcpToRecipeData({ ...recipe, category_id: categories[1].id }, categories)!.category_id).toBe(categories[1].id);
    expect(mcpToRecipeData({ ...recipe, category_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" }, categories)!.category_id).toBe(categories[0].id);
  });

  it("rejects unknown ingredient keys and empty recipes", () => {
    expect(mcpToRecipeData({ ...recipe, ingredients: [{ ...recipe.ingredients[0], ingredient_key: "dragon" }] }, categories)).toBeNull();
    expect(mcpToRecipeData({ ...recipe, steps: [] }, categories)).toBeNull();
    expect(mcpToRecipeData({ title: "x" }, categories)).toBeNull();
  });
});
