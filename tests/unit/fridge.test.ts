import { describe, expect, it } from "vitest";
import { matchFridge, parseFridgeInput, type FridgeRecipe } from "@/lib/fridge";

const recipe = (id: string, ingredients: string[]): FridgeRecipe => ({
  id, title: id, photo_path: null, author_first_name: null, in_notebook: true,
  ingredients: ingredients.map((name) => ({ name, ingredient_key: null })),
});

describe("frigo vide", () => {
  const recipes = [
    recipe("omelette", ["œufs", "lait", "sel", "poivre"]),
    recipe("gratin", ["pommes de terre", "crème", "fromage râpé", "ail"]),
    recipe("crumble", ["pommes", "farine", "beurre", "sucre"]),
    recipe("soupe", ["poireaux", "pommes de terre", "eau"]),
  ];

  it("ranks by fewest missing ingredients, ignoring salt, pepper and water", () => {
    const result = matchFridge(["oeufs", "lait"], recipes);
    expect(result.map((m) => m.recipe.id)).toEqual(["omelette"]);
    expect(result[0].missing).toEqual([]);
  });

  it("does not confuse pommes and pommes de terre, nor two vegetables of the same family", () => {
    expect(matchFridge(["pommes de terre"], recipes).map((m) => m.recipe.id)).toEqual(["soupe", "gratin"]);
    expect(matchFridge(["brocoli"], recipes)).toEqual([]);
    expect(matchFridge(["poireau"], recipes).map((m) => m.recipe.id)).toEqual(["soupe"]);
  });

  it("parses a typed list", () => {
    expect(parseFridgeInput("3 œufs, 20 cl de lait et des courgettes")).toEqual(["œufs", "lait", "des courgettes"]);
  });
});
