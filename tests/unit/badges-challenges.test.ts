import { describe, expect, it } from "vitest";
import { badgeProgress } from "@/lib/badges";
import { challengeFor } from "@/lib/challenges";

describe("badges", () => {
  it("earned first, with what remains for the others", () => {
    const list = badgeProgress({ written: 3, cooked: 0, adopted: 5, friends: 1, challenges: 0, featured: 0 });
    expect(list.filter((b) => b.earned).map((b) => b.key)).toEqual(["firstRecipe", "traveller"]);
    expect(list.find((b) => b.key === "tenRecipes")?.remaining).toBe(7);
  });
});

describe("monthly challenge", () => {
  it("uses Paris time for the month", () => {
    expect(challengeFor(new Date("2026-10-31T23:30:00Z")).key).toBe("2026-11");
    expect(challengeFor(new Date("2026-10-05T12:00:00Z"))).toMatchObject({ key: "2026-10", title: "Pommes et courges" });
  });
});
