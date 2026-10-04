import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

/** Info is colour-coded everywhere: time apricot, difficulty sage, servings brass. */
export type InfoKind = "time" | "difficulty" | "servings";

const infoStyles: Record<InfoKind, { icon: IconName; className: string }> = {
  time: { icon: "clock", className: "bg-abricot-soft text-abricot-ink" },
  difficulty: { icon: "level", className: "bg-sauge-soft text-sauge-ink" },
  servings: { icon: "plate", className: "bg-laiton-soft text-laiton-ink" },
};

export function InfoPill({ kind, children }: { kind: InfoKind; children: ReactNode }) {
  const { icon, className } = infoStyles[kind];
  return (
    <span className={cx("inline-flex h-8 items-center gap-1.5 rounded-pill px-3 text-small font-semibold", className)}>
      <Icon name={icon} size={18} />
      {children}
    </span>
  );
}

export type TagTone = "sauge" | "tomate" | "laiton" | "prune";

const tagTones: Record<TagTone, string> = {
  sauge: "bg-sauge-soft text-sauge-ink",
  tomate: "bg-tomate-soft text-tomate-dark",
  laiton: "bg-laiton-soft text-laiton-ink",
  prune: "bg-prune-soft text-prune",
};

export function Tag({ tone, children }: { tone: TagTone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-7 items-center rounded-tag px-2.5 text-small font-semibold", tagTones[tone])}>
      {children}
    </span>
  );
}
