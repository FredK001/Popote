import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AISLES, FAMILIES, INGREDIENT_KEYS, INGREDIENTS } from "@/lib/recipes/ingredient-catalog";

const sprite = readFileSync("public/icons/sprite.svg", "utf8");

describe("ingredient catalogue", () => {
  it("has about thirty ingredients plus one generic per family", () => {
    expect(INGREDIENT_KEYS.length).toBeGreaterThanOrEqual(38);
    for (const family of FAMILIES) expect(INGREDIENT_KEYS).toContain(family);
  });

  it.each(INGREDIENT_KEYS)("%s has a picto and a known aisle", (key) => {
    expect(sprite).toContain(`id="g-${key}"`);
    expect(AISLES).toContain(INGREDIENTS[key].aisle);
  });
});
