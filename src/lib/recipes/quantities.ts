/**
 * Quantity scaling and display for ingredients.
 *
 * Rounding rules (brief §7):
 * - countable things (no unit, or a counted unit like "gousse") → whole numbers, at least 1;
 * - grams / millilitres → whole numbers, multiples of 5 above 50;
 * - spoons → halves;
 * - kilograms / litres and anything else → up to 2 decimals.
 */

const COUNTED_UNITS = new Set([
  "pincée", "gousse", "tranche", "feuille", "brin", "boîte", "sachet", "pot", "botte", "branche",
  "poignée", "morceau", "noix", "verre", "tasse", "bol", "rouleau", "pâte", "cube", "carré",
]);

const FINE_UNITS = new Set(["g", "ml"]);
const SPOON_UNITS = new Set(["c. à soupe", "c. à café", "cuillère à soupe", "cuillère à café", "cs", "cc"]);

const PLURALS: Record<string, string> = {
  pincée: "pincées", gousse: "gousses", tranche: "tranches", feuille: "feuilles", brin: "brins",
  boîte: "boîtes", sachet: "sachets", pot: "pots", botte: "bottes", branche: "branches",
  poignée: "poignées", morceau: "morceaux", verre: "verres", tasse: "tasses", bol: "bols",
  rouleau: "rouleaux", cube: "cubes", carré: "carrés",
};

export type UnitKind = "counted" | "fine" | "spoon" | "other";

export function unitKind(unit: string | null | undefined): UnitKind {
  const u = unit?.trim().toLowerCase();
  if (!u) return "counted";
  if (COUNTED_UNITS.has(u)) return "counted";
  if (FINE_UNITS.has(u)) return "fine";
  if (SPOON_UNITS.has(u)) return "spoon";
  return "other";
}

/** Scales a base quantity from baseServings to servings, then rounds by unit kind. */
export function scaleQuantity(
  quantity: number,
  unit: string | null | undefined,
  baseServings: number,
  servings: number,
): number {
  const raw = (quantity * servings) / baseServings;
  return roundQuantity(raw, unit);
}

export function roundQuantity(value: number, unit: string | null | undefined): number {
  switch (unitKind(unit)) {
    case "counted":
      return Math.max(1, Math.round(value));
    case "fine":
      if (value > 50) return Math.round(value / 5) * 5;
      return Math.max(1, Math.round(value));
    case "spoon":
      return Math.max(0.5, Math.round(value * 2) / 2);
    case "other":
      return Math.round(value * 100) / 100;
  }
}

const FRACTIONS: Record<string, string> = { "0.25": "¼", "0.5": "½", "0.75": "¾" };

/** French number display: 1,5 → "1 ½", 0.25 → "¼", 2.35 → "2,35". */
export function formatNumber(value: number): string {
  const whole = Math.floor(value);
  const rest = Math.round((value - whole) * 100) / 100;
  const fraction = FRACTIONS[String(rest)];
  if (fraction) return whole === 0 ? fraction : `${whole} ${fraction}`;
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

export function formatUnit(unit: string | null | undefined, value: number): string {
  if (!unit) return "";
  const u = unit.trim();
  return value > 1 && PLURALS[u.toLowerCase()] ? PLURALS[u.toLowerCase()] : u;
}

/** "100 g", "2 pincées", "5", "1 ½ c. à soupe". Empty when there is no quantity. */
export function formatQuantity(value: number | null | undefined, unit: string | null | undefined): string {
  if (value == null) return unit?.trim() ?? "";
  const unitText = formatUnit(unit, value);
  return unitText ? `${formatNumber(value)} ${unitText}` : formatNumber(value);
}

/** Parses "1,5", "1.5", "½", "1 ½", "3/4" typed by the user. Returns null when empty or invalid. */
export function parseQuantity(input: string): number | null {
  const s = input.trim().replace(",", ".");
  if (!s) return null;
  const unicode: Record<string, number> = { "¼": 0.25, "½": 0.5, "¾": 0.75, "⅓": 1 / 3, "⅔": 2 / 3 };
  const mixed = s.match(/^(\d+(?:\.\d+)?)?\s*([¼½¾⅓⅔])$/);
  if (mixed) return (mixed[1] ? Number(mixed[1]) : 0) + unicode[mixed[2]];
  const frac = s.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (frac) {
    const den = Number(frac[3]);
    if (den === 0) return null;
    return (frac[1] ? Number(frac[1]) : 0) + Number(frac[2]) / den;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}
