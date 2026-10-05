import { describe, expect, it } from "vitest";
import { aisleOf, groupByAisle, linesForRecipe, mergeLines } from "@/lib/shopping";
import type { Ingredient } from "@/lib/recipes/types";

const ing = (id: string, name: string, quantity: number | null, unit: string | null, extra: Partial<Ingredient> = {}): Ingredient => ({
  id, position: 0, name, quantity, unit, ingredient_key: null, ...extra,
});

describe("shopping list", () => {
  it("finds the aisle from the stored value, the key, or the name", () => {
    expect(aisleOf(ing("1", "truc", 1, null, { aisle: "surgeles" }))).toBe("surgeles");
    expect(aisleOf(ing("1", "pommes", 1, null))).toBe("fruits-legumes");
    expect(aisleOf(ing("1", "machin bizarre", 1, null))).toBe("autre");
  });

  it("scales quantities and applies the user's own version", () => {
    const lines = linesForRecipe([ing("a", "farine", 200, "g"), ing("b", "œufs", 3, null), ing("c", "sel", null, null)], 4, 8, { b: 2 });
    expect(lines.map((l) => l.quantity)).toEqual([400, 4, null]);
  });

  it("adds up the same ingredient and unit, keeps checked items apart", () => {
    const { updates, inserts } = mergeLines(
      [
        { id: "x", name: "Farine", unit: "g", quantity: 100, checked: false },
        { id: "y", name: "sucre", unit: "g", quantity: 50, checked: true },
      ],
      [
        { name: "farine", unit: "g", quantity: 200, ingredient_key: null, aisle: "epicerie-sucree" },
        { name: "sucre", unit: "g", quantity: 30, ingredient_key: null, aisle: "epicerie-sucree" },
        { name: "sucre", unit: "g", quantity: 20, ingredient_key: null, aisle: "epicerie-sucree" },
      ],
    );
    expect(updates).toEqual([{ id: "x", quantity: 300 }]);
    expect(inserts).toHaveLength(1);
    expect(inserts[0].quantity).toBe(50);
  });

  it("groups by aisle in shop order, checked last", () => {
    const groups = groupByAisle([
      { aisle: "cremerie", checked: true, n: 1 },
      { aisle: "fruits-legumes", checked: false, n: 2 },
      { aisle: "cremerie", checked: false, n: 3 },
    ]);
    expect(groups.map((g) => g.aisle)).toEqual(["fruits-legumes", "cremerie"]);
    expect(groups[1].items.map((i) => i.n)).toEqual([3, 1]);
  });
});
