import { describe, expect, it } from "vitest";
import { format } from "@/messages";

describe("format", () => {
  it("fills placeholders", () => {
    expect(format("{done} sur {total}", { done: 2, total: 6 })).toBe("2 sur 6");
  });

  it("leaves unknown placeholders untouched", () => {
    expect(format("Lancer {n} min", {})).toBe("Lancer {n} min");
  });
});
