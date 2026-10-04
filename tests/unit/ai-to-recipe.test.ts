import { describe, expect, it } from "vitest";
import { fakeProvider } from "@/lib/ai/fake-provider";
import { pointsToCheck, type RecipeDraft } from "@/lib/ai/schema";
import { answerQuestion, chooseIngredientQuantity, draftToRecipeInput } from "@/lib/ai/to-recipe";
import { recipeInput } from "@/lib/recipes/schema";

const draft = (await fakeProvider.generate({ mode: "text", text: "x" })) as RecipeDraft;
const categories = [{ id: "11111111-1111-4111-8111-111111111111", default_key: "desserts" }];

describe("answering the AI", () => {
  it("fills servings from a one-tap answer and closes the question", () => {
    const next = answerQuestion(draft, draft.questions[0], "6");
    expect(next.servings).toEqual({ value: 6, confidence: "high", alternatives: [] });
    expect(next.questions).toHaveLength(0);
  });

  it("fixes an unsure ingredient quantity", () => {
    const next = chooseIngredientQuantity(draft, 2, { quantity: 150, unit: "g" });
    expect(next.ingredients[2]).toMatchObject({ quantity: 150, unit: "g", confidence: "high" });
    expect(pointsToCheck(next)).toBe(pointsToCheck(draft) - 1);
  });

  it("parses an ingredient answer like « 1 c. à soupe »", () => {
    const q = { field: "ingredient" as const, ingredient_index: 2, question: "?", options: ["1 c. à soupe", "1 c. à café"] };
    const next = answerQuestion({ ...draft, questions: [q] }, q, "1 c. à soupe");
    expect(next.ingredients[2]).toMatchObject({ quantity: 1, unit: "c. à soupe" });
  });

  it("maps difficulty words", () => {
    const q = { field: "difficulty" as const, ingredient_index: null, question: "?", options: ["Facile", "Moyen"] };
    expect(answerQuestion({ ...draft, questions: [q] }, q, "Moyen").difficulty.value).toBe(2);
  });
});

describe("draftToRecipeInput", () => {
  it("produces a valid recipe input", () => {
    const input = draftToRecipeInput(answerQuestion(draft, draft.questions[0], "6"), {
      categories,
      sourceUrl: "https://example.com/tarte",
    });
    const parsed = recipeInput.safeParse(input);
    expect(parsed.success).toBe(true);
    expect(parsed.data).toMatchObject({
      title: "Tarte fine aux pommes",
      servings: 6,
      category_id: categories[0].id,
      source_url: "https://example.com/tarte",
      origin_label: "Mamie Odette",
    });
    expect(parsed.data!.steps[2].timer_seconds).toBe(1500);
    expect(parsed.data!.ingredients[0].ingredient_key).toBe("pate");
  });

  it("falls back to 4 servings when still unknown", () => {
    expect(draftToRecipeInput(draft, { categories: [] }).servings).toBe(4);
  });
});
