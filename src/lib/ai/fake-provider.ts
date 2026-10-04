import type { AiProvider, DraftInput } from "./provider";
import type { RecipeDraft } from "./schema";

/**
 * Simulated AI for development and end-to-end tests (AI_FAKE_PROVIDER=1, never in
 * production). Returns a fixed draft with one unsure ingredient and one question;
 * the word "illisible" in the text simulates an unreadable input.
 */
export const fakeProvider: AiProvider = {
  id: "fake",
  async generate(input: DraftInput): Promise<unknown> {
    if (input.text?.includes("illisible")) return { ...BASE, problem: "blurry" };
    if (input.previous && input.answers?.length) {
      return { ...input.previous, questions: [] };
    }
    return BASE;
  },
};

const BASE: RecipeDraft = {
  title: { value: "Tarte fine aux pommes", confidence: "high", alternatives: [] },
  description: null,
  servings: { value: null, confidence: "low", alternatives: [4, 6] },
  prep_minutes: { value: 20, confidence: "high", alternatives: [] },
  cook_minutes: { value: 25, confidence: "high", alternatives: [] },
  difficulty: { value: 1, confidence: "high", alternatives: [] },
  category_key: "desserts",
  tags: [],
  origin_label: "Mamie Odette",
  ingredients: [
    { quantity: 1, unit: null, name: "pâte feuilletée", ingredient_key: "pate", aisle: "cremerie", confidence: "high", alternatives: [] },
    { quantity: 5, unit: null, name: "pommes", ingredient_key: "pomme", aisle: "fruits-legumes", confidence: "high", alternatives: [] },
    {
      quantity: 100, unit: "g", name: "sucre", ingredient_key: "sucre", aisle: "epicerie-sucree", confidence: "low",
      alternatives: [{ quantity: 100, unit: "g" }, { quantity: 150, unit: "g" }],
    },
  ],
  steps: [
    { text: "Préchauffe le four à 200 °C.", timer_minutes: null },
    { text: "Dispose les pommes en rosace sur la pâte et saupoudre de sucre.", timer_minutes: null },
    { text: "Enfourne.", timer_minutes: 25 },
  ],
  questions: [{ field: "servings", ingredient_index: null, question: "Pour combien de personnes ?", options: ["4", "6", "8"] }],
  dish_photo_index: null,
  problem: "none",
};
