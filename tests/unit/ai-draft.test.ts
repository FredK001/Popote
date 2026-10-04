import { describe, expect, it } from "vitest";
import { fakeProvider } from "@/lib/ai/fake-provider";
import { AiError, draftRecipe, type AiProvider } from "@/lib/ai/provider";
import { pointsToCheck, sanitizeDraft, type RecipeDraft } from "@/lib/ai/schema";

const valid = (await fakeProvider.generate({ mode: "text", text: "tarte" })) as RecipeDraft;

function scripted(...outputs: unknown[]): AiProvider & { calls: number } {
  return {
    id: "fake",
    calls: 0,
    async generate() {
      return outputs[Math.min(this.calls++, outputs.length - 1)];
    },
  };
}

describe("sanitizeDraft", () => {
  it("accepts a valid draft", () => {
    expect(sanitizeDraft(valid)?.title.value).toBe("Tarte fine aux pommes");
  });

  it("rejects malformed JSON shapes", () => {
    expect(sanitizeDraft({ title: "Tarte" })).toBeNull();
    expect(sanitizeDraft("not json")).toBeNull();
  });

  it("rejects an unknown ingredient key (closed list)", () => {
    const bad = { ...valid, ingredients: [{ ...valid.ingredients[0], ingredient_key: "licorne" }] };
    expect(sanitizeDraft(bad)).toBeNull();
  });

  it("clamps numbers and trims lists", () => {
    const d = sanitizeDraft({
      ...valid,
      servings: { value: 400, confidence: "low", alternatives: [2, 2, 4, 6, 8] },
      difficulty: { value: 7, confidence: "high", alternatives: [] },
      steps: [{ text: "  Cuire.  ", timer_minutes: 0.4 }],
      dish_photo_index: 3,
    }, 2)!;
    expect(d.servings.value).toBe(50);
    expect(d.servings.alternatives).toEqual([2, 4, 6]);
    expect(d.difficulty.value).toBe(3);
    expect(d.steps[0]).toEqual({ text: "Cuire.", timer_minutes: 1 });
    expect(d.dish_photo_index).toBeNull();
  });

  it("drops questions without options or pointing nowhere", () => {
    const d = sanitizeDraft({
      ...valid,
      questions: [
        { field: "servings", ingredient_index: null, question: "?", options: ["4"] },
        { field: "ingredient", ingredient_index: 9, question: "?", options: ["a", "b"] },
        { field: "ingredient", ingredient_index: 2, question: "Combien de sucre ?", options: ["100 g", "150 g"] },
      ],
    })!;
    expect(d.questions.map((q) => q.question)).toEqual(["Combien de sucre ?"]);
  });

  it("refuses a 'readable' draft with no ingredients or no steps", () => {
    expect(sanitizeDraft({ ...valid, steps: [] })).toBeNull();
  });

  it("counts the points to check", () => {
    expect(pointsToCheck(sanitizeDraft(valid)!)).toBe(2); // sugar, and the servings question (counted once)
  });
});

describe("draftRecipe", () => {
  it("retries once after an unusable answer", async () => {
    const provider = scripted({ nope: true }, valid);
    await expect(draftRecipe(provider, { mode: "text", text: "x" })).resolves.toMatchObject({ problem: "none" });
    expect(provider.calls).toBe(2);
  });

  it("gives up after two unusable answers", async () => {
    const provider = scripted({ nope: true });
    await expect(draftRecipe(provider, { mode: "text", text: "x" })).rejects.toMatchObject({ kind: "invalid_output" });
    expect(provider.calls).toBe(2);
  });

  it("reports unreadable input without retrying", async () => {
    const provider = scripted({ ...valid, problem: "blurry" });
    const error = await draftRecipe(provider, { mode: "photos" }).catch((e) => e);
    expect(error).toBeInstanceOf(AiError);
    expect(error).toMatchObject({ kind: "unreadable", detail: "blurry" });
    expect(provider.calls).toBe(1);
  });

  it("refines with the cook's answers", async () => {
    const first = await draftRecipe(fakeProvider, { mode: "text", text: "tarte" });
    const second = await draftRecipe(fakeProvider, { mode: "text", previous: first, answers: ["6"] });
    expect(second.questions).toHaveLength(0);
  });
});
