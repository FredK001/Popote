import { describe, expect, it } from "vitest";
import { contrastRatio, readColorTokens } from "./tokens";

const tokens = readColorTokens();

/**
 * Every text/background pair used by the components. Add a line whenever a
 * component introduces a new pair: the suite enforces WCAG AA (4.5:1).
 */
const TEXT_PAIRS: Array<[text: string, background: string]> = [
  // Body text on papers and surfaces
  ["encre", "fond"], ["encre", "fond-2"], ["encre", "surface"],
  ["encre-2", "fond"], ["encre-2", "surface"], ["encre-2", "fond-2"],
  ["encre-3", "fond"], ["encre-3", "surface"],
  ["encre-2", "sauge-soft"],
  // White on solid colours (white on brass is mandatory)
  ["blanc", "tomate"], ["blanc", "tomate-dark"], ["blanc", "laiton"], ["blanc", "sauge"],
  ["blanc", "prune"], ["blanc", "bleu-nuit"], ["blanc", "encre"], ["blanc", "encre-2"],
  ["blanc", "abricot-ink"], ["blanc", "succes"], ["blanc", "erreur"],
  // Tinted pills, tags, categories: ink of the same family
  ["abricot-ink", "abricot-soft"], ["sauge-ink", "sauge-soft"], ["laiton-ink", "laiton-soft"],
  ["tomate-dark", "tomate-soft"], ["prune", "prune-soft"],
  ["alerte-ink", "alerte-soft"], ["succes", "succes-soft"],
  // Links, active tab, errors
  ["tomate-dark", "surface"], ["tomate-dark", "fond"], ["erreur", "surface"],
  // Toast
  ["succes-on-dark", "encre"],
];

/** Non-text UI (borders of controls, focus ring): WCAG 1.4.11 asks for 3:1. */
const UI_PAIRS: Array<[foreground: string, background: string]> = [
  ["bleu-nuit", "fond"], ["bleu-nuit", "surface"],
  ["encre-3", "surface"], ["encre", "surface"], ["erreur", "surface"],
];

describe("design tokens contrast", () => {
  it.each(TEXT_PAIRS)("text %s on %s reaches 4.5:1", (fg, bg) => {
    expect(tokens[fg], `missing token --${fg}`).toBeDefined();
    expect(tokens[bg], `missing token --${bg}`).toBeDefined();
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it.each(UI_PAIRS)("UI %s on %s reaches 3:1", (fg, bg) => {
    expect(contrastRatio(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(3);
  });
});
