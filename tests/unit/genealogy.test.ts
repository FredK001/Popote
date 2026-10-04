import { describe, expect, it } from "vitest";
import { buildLineage, isInterestingLineage, type GenealogyRow } from "@/lib/recipes/genealogy";

const row = (position: number, id: string, name: string, extra: Partial<GenealogyRow> = {}): GenealogyRow => ({
  position,
  user_id: id,
  first_name: name,
  avatar_color: "sauge",
  avatar_url: null,
  received_at: null,
  is_author: position === 0,
  ...extra,
});

describe("buildLineage", () => {
  const rows = [row(2, "me", "Léa"), row(0, "julie", "Julie"), row(1, "fred", "Fred")];

  it("orders from origin to the viewer", () => {
    const nodes = buildLineage({ rows, originLabel: "Mamie Odette", originYear: 1974, viewerId: "me" });
    expect(nodes.map((n) => (n.kind === "person" ? `${n.name}:${n.role}` : n.kind))).toEqual([
      "origin", "Julie:author", "Fred:relay", "Léa:me",
    ]);
    expect(nodes[0]).toEqual({ kind: "origin", label: "Mamie Odette", year: 1974 });
  });

  it("ends with an invitation on the public page", () => {
    const nodes = buildLineage({ rows: rows.slice(1), originLabel: null, originYear: null, invite: true });
    expect(nodes.map((n) => n.kind)).toEqual(["person", "person", "you"]);
  });

  it("hides an origin that is just the author's name", () => {
    const nodes = buildLineage({ rows: [row(0, "julie", "Julie")], originLabel: " julie ", originYear: null, viewerId: "julie" });
    expect(nodes).toHaveLength(1);
    expect(isInterestingLineage(nodes)).toBe(false);
  });

  it("ignores duplicates and unknown colours", () => {
    const nodes = buildLineage({
      rows: [row(0, "a", "Ana", { avatar_color: "rose" }), row(1, "a", "Ana")],
      originLabel: null,
      originYear: null,
    });
    expect(nodes).toHaveLength(1);
    expect(nodes[0]).toMatchObject({ kind: "person", color: "tomate" });
  });
});
