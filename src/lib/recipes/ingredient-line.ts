import { parseQuantity } from "./quantities";

const UNITS: Array<[RegExp, string]> = [
  [/^(kg|kilos?|kilogrammes?)$/i, "kg"],
  [/^(g|gr|grammes?)$/i, "g"],
  [/^(mg)$/i, "mg"],
  [/^(l|litres?)$/i, "l"],
  [/^(dl|décilitres?)$/i, "dl"],
  [/^(cl|centilitres?)$/i, "cl"],
  [/^(ml|millilitres?)$/i, "ml"],
  [/^(c\.?\s?à\s?s\.?|cuill?\.?\s?à\s?soupe|cuillères?\s?à\s?soupe|càs|cs|tbsp)$/i, "c. à soupe"],
  [/^(c\.?\s?à\s?c\.?|cuill?\.?\s?à\s?café|cuillères?\s?à\s?café|càc|cc|tsp)$/i, "c. à café"],
  [/^(pincées?)$/i, "pincée"],
  [/^(gousses?)$/i, "gousse"],
  [/^(tranches?)$/i, "tranche"],
  [/^(sachets?)$/i, "sachet"],
  [/^(boîtes?|boites?)$/i, "boîte"],
  [/^(bottes?)$/i, "botte"],
  [/^(brins?)$/i, "brin"],
  [/^(feuilles?)$/i, "feuille"],
  [/^(verres?)$/i, "verre"],
  [/^(tasses?)$/i, "tasse"],
  [/^(poignées?)$/i, "poignée"],
];

// Longest first so "cuillère à soupe" wins over "c".
const UNIT_PHRASES = [
  "cuillères à soupe", "cuillère à soupe", "cuil. à soupe", "c. à soupe", "c.à.s", "càs",
  "cuillères à café", "cuillère à café", "cuil. à café", "c. à café", "c.à.c", "càc",
];

export type ParsedIngredient = { quantity: number | null; unit: string | null; name: string };

/**
 * Splits a free ingredient line ("200 g de farine", "2 c. à soupe d'huile d'olive",
 * "1 ½ citron", "sel, poivre") into quantity, unit and name.
 */
export function parseIngredientLine(line: string): ParsedIngredient {
  let rest = line.replace(/\s+/g, " ").trim();
  if (!rest) return { quantity: null, unit: null, name: "" };

  // Quantity: "1", "1,5", "1.5", "½", "1 ½", "1/2", "1 1/2", ranges "2-3" keep the first.
  const qty = rest.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?\s*[¼½¾⅓⅔]?|[¼½¾⅓⅔])(?:\s*[-–à]\s*\d+(?:[.,]\d+)?)?\s*/);
  let quantity: number | null = null;
  if (qty) {
    quantity = parseQuantity(qty[1].replace(/\s+(?=[¼½¾⅓⅔])/, " ").trim());
    if (quantity != null) rest = rest.slice(qty[0].length);
  }

  let unit: string | null = null;
  if (quantity != null) {
    const lower = rest.toLowerCase();
    const phrase = UNIT_PHRASES.find((p) => lower.startsWith(p));
    if (phrase) {
      unit = phrase.includes("soupe") || phrase === "càs" || phrase === "c.à.s" ? "c. à soupe" : "c. à café";
      rest = rest.slice(phrase.length).trim();
    } else {
      const word = rest.match(/^([^\s]+)\s*/);
      const match = word && UNITS.find(([re]) => re.test(word[1].replace(/\.$/, "")));
      if (word && match) {
        unit = match[1];
        rest = rest.slice(word[0].length);
      }
    }
  }

  // "de farine", "d'huile", "des pommes" → name.
  const name = rest.replace(/^(de\s+la\s+|de\s+l['’]|de\s+|d['’]|des\s+|du\s+)/i, "").trim();
  return { quantity, unit, name: name || line.trim() };
}
