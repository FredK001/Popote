import type { PictoId } from "@/components/ui/Icon";
import type { SoftTone } from "@/components/ui/IngredientTile";
import { INGREDIENTS, isIngredientKey, tintFor, type IngredientKey } from "./ingredient-catalog";

function normalize(s: string): string {
  return ` ${s.toLowerCase().replace(/\s+/g, " ").trim()} `;
}

/** Guesses a catalogue key from a typed ingredient name (manual entry, JSON-LD import). */
export function guessIngredientKey(name: string): IngredientKey | null {
  const n = normalize(name);
  for (const [key, entry] of Object.entries(INGREDIENTS) as Array<[IngredientKey, (typeof INGREDIENTS)[IngredientKey]]>) {
    // Whole-word-ish match: "ail" must not match "maille" or "travail".
    if (entry.words.some((w) => new RegExp(`(^|[^\\p{L}])${escape(w.trim())}`, "u").test(n))) return key;
  }
  return null;
}

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function ingredientPicto(key: string | null | undefined): { picto: PictoId; tint: SoftTone } {
  if (isIngredientKey(key)) return { picto: `g-${key}` as PictoId, tint: tintFor(key) };
  return { picto: "g-autre", tint: "abricot" };
}
