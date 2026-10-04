import type { ProfileColor } from "./types";

/** One row of public.recipe_genealogy / my_recipe_genealogy, ordered from the author. */
export type GenealogyRow = {
  position: number;
  user_id: string;
  first_name: string;
  avatar_color: string;
  avatar_url: string | null;
  received_at: string | null;
  is_author: boolean;
};

export type LineageNode =
  | { kind: "origin"; label: string; year: number | null }
  | {
      kind: "person";
      userId: string;
      name: string;
      color: ProfileColor;
      photoUrl: string | null;
      role: "author" | "relay" | "me";
      receivedAt: string | null;
    }
  | { kind: "you" };

type LineageInput = {
  rows: GenealogyRow[];
  originLabel: string | null;
  originYear: number | null;
  /** Signed-in viewer: their own node is marked "me". */
  viewerId?: string | null;
  /** Public page: end the chain with an empty "Toi ?" node. */
  invite?: boolean;
};

const COLORS: ProfileColor[] = ["encre", "tomate", "sauge", "prune", "laiton", "abricot", "bleu-nuit"];

/**
 * Builds the displayed chain: origin (e.g. "Mamie Odette, 1974") → author → people
 * who passed it on → me (or "Toi ?" on the share page).
 */
export function buildLineage({ rows, originLabel, originYear, viewerId, invite }: LineageInput): LineageNode[] {
  const nodes: LineageNode[] = [];
  const sorted = [...rows].sort((a, b) => a.position - b.position);
  const authorName = sorted.find((r) => r.is_author)?.first_name.trim().toLowerCase();

  // The origin is shown unless it is just the author's own first name.
  if (originLabel && originLabel.trim().toLowerCase() !== authorName) {
    nodes.push({ kind: "origin", label: originLabel.trim(), year: originYear });
  }

  const seen = new Set<string>();
  for (const row of sorted) {
    if (seen.has(row.user_id)) continue;
    seen.add(row.user_id);
    nodes.push({
      kind: "person",
      userId: row.user_id,
      name: row.first_name || "?",
      color: (COLORS as string[]).includes(row.avatar_color) ? (row.avatar_color as ProfileColor) : "tomate",
      photoUrl: row.avatar_url,
      role: row.user_id === viewerId ? "me" : row.is_author ? "author" : "relay",
      receivedAt: row.received_at,
    });
  }

  if (invite) nodes.push({ kind: "you" });
  return nodes;
}

/** True when the chain is worth showing (more than just "you wrote it"). */
export function isInterestingLineage(nodes: LineageNode[]): boolean {
  return nodes.length > 1;
}
