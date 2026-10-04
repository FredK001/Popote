import type { RecipeInput } from "@/lib/recipes/schema";
import { parseIngredientLine } from "@/lib/recipes/ingredient-line";
import type { Category } from "@/lib/recipes/types";
import type { DraftQuestion, RecipeDraft } from "./schema";

type ScalarField = "title" | "servings" | "prep_minutes" | "cook_minutes" | "difficulty";

/** The cook picked one of the proposed values for an unsure field. */
export function chooseFieldValue<K extends ScalarField>(draft: RecipeDraft, field: K, value: RecipeDraft[K]["value"]): RecipeDraft {
  return { ...draft, [field]: { ...draft[field], value, confidence: "high", alternatives: [] } };
}

/** The cook picked a quantity for an unsure ingredient. */
export function chooseIngredientQuantity(
  draft: RecipeDraft,
  index: number,
  choice: { quantity: number | null; unit: string | null },
): RecipeDraft {
  return {
    ...draft,
    ingredients: draft.ingredients.map((ing, i) =>
      i === index ? { ...ing, quantity: choice.quantity, unit: choice.unit, confidence: "high", alternatives: [] } : ing,
    ),
  };
}

/**
 * Applies a one-tap answer to an AI question and removes the question.
 * Answers that cannot be mapped to a field are kept for a refinement round.
 */
export function answerQuestion(draft: RecipeDraft, question: DraftQuestion, option: string): RecipeDraft {
  const rest = { ...draft, questions: draft.questions.filter((q) => q !== question) };
  const number = Number(option.replace(",", ".").match(/\d+(?:\.\d+)?/)?.[0]);
  switch (question.field) {
    case "title":
      return chooseFieldValue(rest, "title", option.trim());
    case "servings":
    case "prep_minutes":
    case "cook_minutes":
      return Number.isFinite(number) ? chooseFieldValue(rest, question.field, Math.round(number)) : rest;
    case "difficulty": {
      const level = /difficile/i.test(option) ? 3 : /moyen/i.test(option) ? 2 : /facile/i.test(option) ? 1 : Math.round(number);
      return level >= 1 && level <= 3 ? chooseFieldValue(rest, "difficulty", level) : rest;
    }
    case "ingredient": {
      if (question.ingredient_index == null) return rest;
      const parsed = parseIngredientLine(`${option} x`);
      return chooseIngredientQuantity(rest, question.ingredient_index, { quantity: parsed.quantity, unit: parsed.unit });
    }
  }
}

type Options = {
  categories: Pick<Category, "id" | "default_key">[];
  sourceUrl?: string | null;
  photoPath?: string | null;
};

/** Draft → what saveRecipe() expects. Unsure values are kept as the model's best guess. */
export function draftToRecipeInput(draft: RecipeDraft, { categories, sourceUrl, photoPath }: Options): RecipeInput {
  const difficulty = draft.difficulty.value;
  return {
    id: null,
    title: draft.title.value ?? "Ma recette",
    description: draft.description ?? "",
    servings: draft.servings.value ?? 4,
    prep_minutes: draft.prep_minutes.value,
    cook_minutes: draft.cook_minutes.value,
    difficulty: difficulty === 1 || difficulty === 2 || difficulty === 3 ? difficulty : null,
    photo_path: photoPath ?? null,
    source_url: sourceUrl ?? "",
    origin_label: draft.origin_label ?? "",
    origin_year: null,
    category_id: categories.find((c) => c.default_key && c.default_key === draft.category_key)?.id ?? null,
    ingredients: draft.ingredients.map((i) => ({
      id: null,
      quantity: i.quantity,
      unit: i.unit,
      name: i.name,
      ingredient_key: i.ingredient_key,
    })),
    steps: draft.steps.map((s) => ({
      id: null,
      text: s.text,
      timer_seconds: s.timer_minutes ? s.timer_minutes * 60 : null,
    })),
  };
}
