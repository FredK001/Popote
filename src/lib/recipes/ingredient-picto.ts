import type { PictoId } from "@/components/ui/Icon";
import type { SoftTone } from "@/components/ui/IngredientTile";

/**
 * Ingredient pictos available in the sprite (g-*). Phase 3 extends this closed list
 * to ~30 ingredients + one generic per family, and the AI picks the key.
 */
const PICTOS: Record<string, { tint: SoftTone; words: string[] }> = {
  pate: { tint: "laiton", words: ["pâte feuilletée", "pâte brisée", "pâte sablée", "pâte à pizza", "pâte"] },
  pomme: { tint: "tomate", words: ["pomme", "pommes"] },
  creme: { tint: "ciel", words: ["crème", "creme"] },
  sucre: { tint: "prune", words: ["sucre", "cassonade", "vergeoise"] },
  beurre: { tint: "abricot", words: ["beurre"] },
  cannelle: { tint: "sauge", words: ["cannelle"] },
};

/** Guesses a picto key from the ingredient name (manual entry). */
export function guessIngredientKey(name: string): string | null {
  const n = name.toLowerCase();
  if (n.includes("pomme de terre") || n.includes("pommes de terre")) return null;
  for (const [key, { words }] of Object.entries(PICTOS)) {
    if (words.some((w) => n.includes(w))) return key;
  }
  return null;
}

export function ingredientPicto(key: string | null | undefined): { picto: PictoId; tint: SoftTone } {
  const entry = key ? PICTOS[key] : undefined;
  return entry ? { picto: `g-${key}` as PictoId, tint: entry.tint } : { picto: "g-autre", tint: "abricot" };
}
