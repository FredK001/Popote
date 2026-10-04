import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { sourcePageUrl } = await import("@/lib/recipes/source-photo");

describe("sourcePageUrl", () => {
  it("prefers a real source URL", () => {
    expect(sourcePageUrl("https://a.fr/x", "Konbini — konbini.com/y")).toBe("https://a.fr/x");
  });
  it.each([
    ["Konbini — konbini.com/food/tuto-poireaux", "https://konbini.com/food/tuto-poireaux"],
    ["Gourmandiseries — gourmandiseries.fr/gua-bao-boeuf-thai", "https://gourmandiseries.fr/gua-bao-boeuf-thai"],
    ["vu sur https://www.marmiton.org/recettes/abc.aspx", "https://www.marmiton.org/recettes/abc.aspx"],
  ])("finds the page in « %s »", (origin, url) => {
    expect(sourcePageUrl(null, origin)).toBe(url);
  });
  it.each(["Mamie Odette", "Marmiton", null])("no page in %s", (origin) => {
    expect(sourcePageUrl(null, origin)).toBeNull();
  });
});
