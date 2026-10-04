import { describe, expect, it } from "vitest";
import { mcpToRecipeData } from "@/lib/mcp/recipe-tool";
import { originWithoutUrl, sourcePageUrl } from "@/lib/recipes/source-url";

describe("sourcePageUrl", () => {
  it("prefers a real source URL", () => {
    expect(sourcePageUrl("https://a.fr/x", "Konbini — konbini.com/y")).toBe("https://a.fr/x");
  });
  it.each([
    ["Konbini — konbini.com/food/tuto-poireaux", "https://konbini.com/food/tuto-poireaux"],
    ["La petite cuisine de Nat — lapetitecuisinedenat.com/2022/04/tigre-qui-pleure.html", "https://lapetitecuisinedenat.com/2022/04/tigre-qui-pleure.html"],
    ["vu sur https://www.marmiton.org/recettes/abc.aspx", "https://www.marmiton.org/recettes/abc.aspx"],
  ])("finds the page in « %s »", (origin, url) => {
    expect(sourcePageUrl(null, origin)).toBe(url);
  });
  it.each(["Mamie Odette", "Marmiton", "marmiton.org", null])("no page in %s", (origin) => {
    expect(sourcePageUrl(null, origin)).toBeNull();
  });
});

describe("originWithoutUrl", () => {
  it.each([
    ["La petite cuisine de Nat — lapetitecuisinedenat.com/2022/04/tigre-qui-pleure.html", "La petite cuisine de Nat"],
    ["Konbini — konbini.com/food/x", "Konbini"],
    ["Mamie Odette", "Mamie Odette"],
    ["https://site.fr/recette", null],
  ])("%s → %s", (input, output) => {
    expect(originWithoutUrl(input)).toBe(output);
  });
});

describe("MCP recipe with a long address in the origin", () => {
  const f = <T,>(value: T) => ({ value, confidence: "high" as const, alternatives: [] as T[] });
  it("keeps the full page URL as source even past 80 characters, and a clean origin", () => {
    const origin = "La petite cuisine de Nat — lapetitecuisinedenat.com/2022/04/tigre-qui-pleure.html";
    const data = mcpToRecipeData(
      {
        title: f("Tigre qui pleure"), description: null, servings: f(4), prep_minutes: f(20), cook_minutes: f(10),
        difficulty: f(1), category_key: null, tags: [], origin_label: origin, category_id: null,
        ingredients: [{ quantity: 600, unit: "g", name: "bœuf", ingredient_key: "boeuf", aisle: "boucherie", confidence: "high", alternatives: [] }],
        steps: [{ text: "Grille.", timer_minutes: null }],
      },
      [],
    )!;
    expect(data.source_url).toBe("https://lapetitecuisinedenat.com/2022/04/tigre-qui-pleure.html");
    expect(data.origin_label).toBe("La petite cuisine de Nat");
  });
});
