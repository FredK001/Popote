import type { ProfileColor } from "@/lib/recipes/types";

export const PROFILE_COLORS: ProfileColor[] = ["tomate", "sauge", "prune", "laiton", "abricot", "bleu-nuit", "encre"];

/** Full-colour background for a colour token. White text is AA on all of them. */
export const SOLID_BG: Record<ProfileColor, string> = {
  encre: "bg-encre",
  tomate: "bg-tomate",
  sauge: "bg-sauge",
  prune: "bg-prune",
  laiton: "bg-laiton",
  abricot: "bg-abricot-ink",
  "bleu-nuit": "bg-bleu-nuit",
};

export function isProfileColor(value: unknown): value is ProfileColor {
  return typeof value === "string" && (PROFILE_COLORS as string[]).includes(value);
}
