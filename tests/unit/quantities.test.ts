import { describe, expect, it } from "vitest";
import {
  formatNumber, formatQuantity, parseQuantity, roundQuantity, scaleQuantity, unitKind,
} from "@/lib/recipes/quantities";
import { guessIngredientKey, ingredientPicto } from "@/lib/recipes/ingredient-picto";

describe("unitKind", () => {
  it.each([
    [null, "counted"], ["", "counted"], ["gousse", "counted"], ["Pincée", "counted"],
    ["g", "fine"], ["ml", "fine"], ["c. à soupe", "spoon"], ["kg", "other"], ["cl", "other"],
  ])("%s → %s", (unit, kind) => {
    expect(unitKind(unit)).toBe(kind);
  });
});

describe("scaleQuantity", () => {
  it("keeps whole numbers for countable things", () => {
    expect(scaleQuantity(5, null, 6, 4)).toBe(3); // 3.33 apples
    expect(scaleQuantity(1, null, 6, 2)).toBe(1); // never zero
    expect(scaleQuantity(3, "gousse", 4, 6)).toBe(5); // 4.5 → 5
  });

  it("rounds grams to multiples of 5 above 50 g", () => {
    expect(scaleQuantity(100, "g", 6, 4)).toBe(65); // 66.67
    expect(scaleQuantity(250, "g", 4, 6)).toBe(375);
    expect(scaleQuantity(60, "g", 6, 4)).toBe(40); // 40 is under 50: whole gram
    expect(scaleQuantity(30, "g", 6, 4)).toBe(20);
    expect(scaleQuantity(25, "g", 6, 5)).toBe(21); // 20.83
  });

  it("rounds spoons to halves", () => {
    expect(scaleQuantity(2, "c. à soupe", 4, 3)).toBe(1.5);
    expect(scaleQuantity(1, "c. à café", 4, 1)).toBe(0.5);
  });

  it("keeps two decimals for other units", () => {
    expect(scaleQuantity(1, "kg", 4, 6)).toBe(1.5);
    expect(scaleQuantity(1, "kg", 3, 4)).toBe(1.33);
  });

  it("is identity at base servings", () => {
    expect(scaleQuantity(100, "g", 6, 6)).toBe(100);
    expect(roundQuantity(47, "g")).toBe(47);
  });
});

describe("formatting", () => {
  it("formats numbers the French way with fractions", () => {
    expect(formatNumber(1.5)).toBe("1 ½");
    expect(formatNumber(0.5)).toBe("½");
    expect(formatNumber(2.35)).toBe("2,35");
    expect(formatNumber(100)).toBe("100");
  });

  it("formats quantities with plural units", () => {
    expect(formatQuantity(100, "g")).toBe("100 g");
    expect(formatQuantity(2, "pincée")).toBe("2 pincées");
    expect(formatQuantity(1, "pincée")).toBe("1 pincée");
    expect(formatQuantity(5, null)).toBe("5");
    expect(formatQuantity(null, null)).toBe("");
  });
});

describe("parseQuantity", () => {
  it.each([
    ["1,5", 1.5], ["1.5", 1.5], ["½", 0.5], ["1 ½", 1.5], ["3/4", 0.75], ["1 1/2", 1.5], ["200", 200],
  ])("%s → %d", (input, value) => {
    expect(parseQuantity(input)).toBeCloseTo(value);
  });

  it.each(["", "abc", "0", "-2", "1/0"])("rejects %s", (input) => {
    expect(parseQuantity(input)).toBeNull();
  });
});

describe("ingredient pictos", () => {
  it("guesses known ingredients", () => {
    expect(guessIngredientKey("Pommes golden")).toBe("pomme");
    expect(guessIngredientKey("beurre demi-sel")).toBe("beurre");
    expect(guessIngredientKey("pommes de terre")).toBeNull();
    expect(guessIngredientKey("poireaux")).toBeNull();
  });

  it("falls back to the generic picto", () => {
    expect(ingredientPicto(null).picto).toBe("g-autre");
    expect(ingredientPicto("sucre")).toEqual({ picto: "g-sucre", tint: "prune" });
  });
});
