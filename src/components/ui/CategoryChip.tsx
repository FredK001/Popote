import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import { Icon, Picto, type PictoId } from "./Icon";

/** Stored as categories.color_token. Custom categories pick from the same set. */
export type CategoryTone = "encre" | "tomate" | "sauge" | "prune" | "laiton" | "abricot" | "bleu-nuit";

const tones: Record<CategoryTone, { rest: string; active: string }> = {
  encre: { rest: "bg-fond-2 text-encre", active: "bg-encre text-blanc" },
  tomate: { rest: "bg-tomate-soft text-tomate-dark", active: "bg-tomate text-blanc" },
  sauge: { rest: "bg-sauge-soft text-sauge-ink", active: "bg-sauge text-blanc" },
  prune: { rest: "bg-prune-soft text-prune", active: "bg-prune text-blanc" },
  laiton: { rest: "bg-laiton-soft text-laiton-ink", active: "bg-laiton text-blanc" },
  abricot: { rest: "bg-abricot-soft text-abricot-ink", active: "bg-abricot-ink text-blanc" },
  "bleu-nuit": { rest: "bg-ciel-soft text-bleu-nuit", active: "bg-bleu-nuit text-blanc" },
};

/** Tinted classes of a category (tags on the recipe sheet). */
export function categoryTint(tone: CategoryTone): string {
  return tones[tone].rest;
}

const base =
  "tap-target inline-flex h-10 flex-none items-center gap-1.5 rounded-pill px-4 font-bold text-body " +
  "transition-transform duration-150";

type CategoryChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone: CategoryTone;
  picto: PictoId;
  active?: boolean;
};

/** Tinted at rest, full colour (and slightly bigger) when active. */
export function CategoryChip({ tone, picto, active = false, className, children, ...rest }: CategoryChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cx(base, active ? cx(tones[tone].active, "scale-[1.04]") : tones[tone].rest, className)}
      {...rest}
    >
      <Picto id={picto} width={18} fillCurrent />
      {children}
    </button>
  );
}

export function AddCategoryChip({ label, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cx(base, "border-[1.5px] border-dashed border-encre-3 text-encre-2")}
      {...rest}
    >
      <Icon name="plus" size={18} />
    </button>
  );
}
