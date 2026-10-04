import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "@/lib/recipes/ingredient-line";
import { findRecipeNode, isoDurationToMinutes, pageText, recipeFromJsonLd, yieldToServings } from "@/lib/recipes/jsonld";
import { isPrivateAddress } from "@/lib/private-address";

describe("parseIngredientLine", () => {
  it.each([
    ["200 g de farine", { quantity: 200, unit: "g", name: "farine" }],
    ["2 c. à soupe d'huile d'olive", { quantity: 2, unit: "c. à soupe", name: "huile d'olive" }],
    ["1 cuillère à café de sel", { quantity: 1, unit: "c. à café", name: "sel" }],
    ["1 ½ citron", { quantity: 1.5, unit: null, name: "citron" }],
    ["3 gousses d'ail", { quantity: 3, unit: "gousse", name: "ail" }],
    ["25 cl de lait", { quantity: 25, unit: "cl", name: "lait" }],
    ["2-3 pommes", { quantity: 2, unit: null, name: "pommes" }],
    ["sel, poivre", { quantity: null, unit: null, name: "sel, poivre" }],
    ["1 pâte feuilletée", { quantity: 1, unit: null, name: "pâte feuilletée" }],
  ])("%s", (line, expected) => {
    expect(parseIngredientLine(line)).toEqual(expected);
  });
});

const PAGE = `<!doctype html><html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","name":"x"},
{"@type":["Recipe"],"name":"Quiche lorraine","description":"La vraie &amp; la bonne",
"recipeYield":["6","6 parts"],"prepTime":"PT20M","cookTime":"PT45M","recipeCategory":"Plat principal",
"recipeIngredient":["Pour la pâte :","1 pâte brisée","200 g de lardons","3 œufs","20 cl de crème fraîche","sel, poivre"],
"recipeInstructions":[{"@type":"HowToSection","name":"Préparation","itemListElement":[
{"@type":"HowToStep","text":"Préchauffe le four à 180 °C."},{"@type":"HowToStep","text":"Fais revenir les lardons."}]},
{"@type":"HowToStep","text":"Enfourne 45 minutes."}]}]}</script>
</head><body><nav>Menu</nav><h1>Quiche</h1><p>Bonne recette</p><script>track()</script></body></html>`;

describe("JSON-LD import", () => {
  it("finds a Recipe inside @graph and maps it without AI", () => {
    const node = findRecipeNode(PAGE)!;
    const draft = recipeFromJsonLd(node)!;
    expect(draft.title.value).toBe("Quiche lorraine");
    expect(draft.description).toBe("La vraie & la bonne");
    expect(draft.servings.value).toBe(6);
    expect(draft.prep_minutes.value).toBe(20);
    expect(draft.cook_minutes.value).toBe(45);
    expect(draft.category_key).toBe("mains");
    expect(draft.ingredients.map((i) => [i.quantity, i.unit, i.ingredient_key])).toEqual([
      [1, null, "pate"], [200, "g", "lardons"], [3, null, "oeuf"], [20, "cl", "creme"], [null, null, "sel"],
    ]);
    expect(draft.steps.map((s) => s.text)).toEqual([
      "Préchauffe le four à 180 °C.", "Fais revenir les lardons.", "Enfourne 45 minutes.",
    ]);
    expect(draft.questions).toEqual([]);
  });

  it("ignores broken JSON-LD and pages without a recipe", () => {
    expect(findRecipeNode('<script type="application/ld+json">{oops</script>')).toBeNull();
    expect(findRecipeNode("<p>rien</p>")).toBeNull();
  });

  it("parses durations and yields", () => {
    expect(isoDurationToMinutes("PT1H20M")).toBe(80);
    expect(isoDurationToMinutes("P0DT0H45M")).toBe(45);
    expect(isoDurationToMinutes("20 min")).toBeNull();
    expect(yieldToServings("4 personnes")).toBe(4);
    expect(yieldToServings(["6"])).toBe(6);
  });

  it("extracts readable text for the AI fallback", () => {
    const t = pageText(PAGE);
    expect(t).toContain("Bonne recette");
    expect(t).not.toContain("track()");
    expect(t).not.toContain("Menu");
  });
});

describe("isPrivateAddress (SSRF guard)", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.20.0.1", "192.168.1.45", "169.254.169.254", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])(
    "blocks %s",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["93.184.216.34", "2606:4700:4700::1111"])("allows %s", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});
