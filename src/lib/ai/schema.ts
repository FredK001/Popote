import { z } from "zod";
import { AISLES, INGREDIENT_KEYS } from "@/lib/recipes/ingredient-catalog";

/**
 * What an AI (or the JSON-LD importer) returns for a recipe draft.
 * Shared by every provider and by the MCP connector (phase 3b), so it only uses
 * features every structured-output engine accepts: no optional keys (nullable
 * instead), no numeric bounds in the JSON Schema (checked after parsing).
 */

export const CONFIDENCE = ["high", "low"] as const;
export const CATEGORY_KEYS = ["mains", "starters", "desserts", "apero", "brunch"] as const;

/** A scalar field with how sure the model is, and 2-3 alternatives when unsure. */
const field = <T extends z.ZodType>(value: T) =>
  z.object({
    value: value.nullable(),
    confidence: z.enum(CONFIDENCE),
    alternatives: z.array(value),
  });

export const draftIngredient = z.object({
  quantity: z.number().nullable(),
  unit: z.string().nullable(),
  name: z.string(),
  ingredient_key: z.enum(INGREDIENT_KEYS).nullable(),
  aisle: z.enum(AISLES).nullable(),
  confidence: z.enum(CONFIDENCE),
  /** Other plausible quantities when unsure ("100 g" or "150 g"). */
  alternatives: z.array(z.object({ quantity: z.number().nullable(), unit: z.string().nullable() })),
});

export const draftStep = z.object({
  text: z.string(),
  timer_minutes: z.number().nullable(),
});

export const QUESTION_FIELDS = ["title", "servings", "prep_minutes", "cook_minutes", "difficulty", "ingredient"] as const;

/** A short question on something missing or ambiguous, answered in one tap. */
export const draftQuestion = z.object({
  field: z.enum(QUESTION_FIELDS),
  /** Index in ingredients when field is "ingredient". */
  ingredient_index: z.number().nullable(),
  question: z.string(),
  options: z.array(z.string()),
});

export const PROBLEMS = ["none", "blurry", "not_a_recipe", "partial"] as const;

export const recipeDraft = z.object({
  title: field(z.string()),
  description: z.string().nullable(),
  servings: field(z.number()),
  prep_minutes: field(z.number()),
  cook_minutes: field(z.number()),
  difficulty: field(z.number()),
  category_key: z.enum(CATEGORY_KEYS).nullable(),
  tags: z.array(z.string()),
  origin_label: z.string().nullable(),
  ingredients: z.array(draftIngredient),
  steps: z.array(draftStep),
  questions: z.array(draftQuestion),
  /** Index of a photo that shows the finished dish (used as the recipe photo). */
  dish_photo_index: z.number().nullable(),
  /** Why the input could not be read fully. */
  problem: z.enum(PROBLEMS),
});

export type RecipeDraft = z.infer<typeof recipeDraft>;
export type DraftIngredient = z.infer<typeof draftIngredient>;
export type DraftQuestion = z.infer<typeof draftQuestion>;

/**
 * Business checks the JSON Schema cannot express. Returns the cleaned draft or
 * null when the output is unusable (triggers the single retry, then an error).
 */
export function sanitizeDraft(raw: unknown, photoCount = 0): RecipeDraft | null {
  const parsed = recipeDraft.safeParse(raw);
  if (!parsed.success) return null;
  const d = parsed.data;

  const int = (n: number | null, min: number, max: number) =>
    n == null || !Number.isFinite(n) ? null : Math.min(max, Math.max(min, Math.round(n)));
  const scalar = (f: RecipeDraft["servings"], min: number, max: number) => ({
    ...f,
    value: int(f.value, min, max),
    alternatives: [...new Set(f.alternatives.map((a) => int(a, min, max)).filter((a): a is number => a != null))].slice(0, 3),
  });

  const ingredients = d.ingredients
    .filter((i) => i.name.trim())
    .slice(0, 80)
    .map((i) => ({
      ...i,
      name: i.name.trim().slice(0, 120),
      unit: i.unit?.trim().slice(0, 30) || null,
      quantity: i.quantity != null && i.quantity > 0 && i.quantity < 100000 ? i.quantity : null,
      alternatives: i.alternatives.filter((a) => a.quantity == null || (a.quantity > 0 && a.quantity < 100000)).slice(0, 3),
    }));
  const steps = d.steps
    .filter((s) => s.text.trim())
    .slice(0, 60)
    .map((s) => ({ text: s.text.trim().slice(0, 2000), timer_minutes: int(s.timer_minutes, 1, 1440) }));

  if (d.problem === "none" && (ingredients.length === 0 || steps.length === 0)) return null;

  return {
    ...d,
    title: { ...d.title, value: d.title.value?.trim().slice(0, 120) || null, alternatives: d.title.alternatives.slice(0, 3) },
    description: d.description?.trim().slice(0, 2000) || null,
    servings: scalar(d.servings, 1, 50),
    prep_minutes: scalar(d.prep_minutes, 0, 2880),
    cook_minutes: scalar(d.cook_minutes, 0, 2880),
    difficulty: scalar(d.difficulty, 1, 3),
    tags: d.tags.map((t) => t.trim()).filter(Boolean).slice(0, 8),
    origin_label: d.origin_label?.trim().slice(0, 80) || null,
    ingredients,
    steps,
    questions: d.questions
      .filter((q) => q.options.length >= 2 && (q.field !== "ingredient" || (q.ingredient_index != null && q.ingredient_index < ingredients.length)))
      .map((q) => ({ ...q, options: q.options.slice(0, 3) }))
      .slice(0, 5),
    dish_photo_index:
      d.dish_photo_index != null && d.dish_photo_index >= 0 && d.dish_photo_index < photoCount ? Math.round(d.dish_photo_index) : null,
  };
}

/** Counts what the user should check: low-confidence fields and open questions. */
export function pointsToCheck(d: RecipeDraft): number {
  // A field or ingredient already covered by a question counts once.
  const asked = new Set(d.questions.map((q) => (q.field === "ingredient" ? `ingredient:${q.ingredient_index}` : q.field)));
  const fields = (["title", "servings", "prep_minutes", "cook_minutes", "difficulty"] as const).filter(
    (f) => d[f].confidence === "low" && !asked.has(f),
  ).length;
  const ingredients = d.ingredients.filter((i, index) => i.confidence === "low" && !asked.has(`ingredient:${index}`)).length;
  return fields + ingredients + d.questions.length;
}
