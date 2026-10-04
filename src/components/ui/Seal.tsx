import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon, type IconName } from "./Icon";

export type SealTone = "tomate" | "sauge" | "bleu-nuit" | "laiton";

const sealTones: Record<SealTone, string> = {
  tomate: "bg-tomate",
  sauge: "bg-sauge",
  "bleu-nuit": "bg-bleu-nuit",
  laiton: "bg-laiton",
};

type SealProps = {
  tone?: SealTone;
  children: ReactNode;
  detail?: ReactNode;
  /** Compact pill version (recipe sheet header). */
  compact?: boolean;
  /** Pops in with a bounce; pass a changing key to replay. */
  animate?: boolean;
};

/** A seal shows the state of a recipe ("Dans mon carnet", "Je l'ai faite"). */
export function Seal({ tone = "tomate", children, detail, compact, animate }: SealProps) {
  return (
    <span
      className={cx(
        "inline-flex flex-col items-center justify-center text-center font-extrabold leading-tight text-blanc",
        sealTones[tone],
        compact ? "h-9 rounded-pill px-3.5 text-small" : "size-24 rounded-pill p-3.5 text-small",
        animate && "animate-pop",
      )}
    >
      {children}
      {detail && <small className="mt-1 text-caption font-semibold opacity-90">{detail}</small>}
    </span>
  );
}

type BadgeProps = {
  icon: IconName;
  title: string;
  subtitle: string;
  locked?: boolean;
};

/** A badge shows profile progress. */
export function Badge({ icon, title, subtitle, locked }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-2.5 rounded-pill border border-trait bg-surface py-2 pl-2 pr-3.5">
      <span
        className={cx(
          "flex size-9 items-center justify-center rounded-pill",
          locked ? "bg-fond-2 text-encre-3" : "bg-laiton text-blanc",
        )}
      >
        <Icon name={icon} size={20} />
      </span>
      <span>
        <b className="block text-small leading-tight">{title}</b>
        <span className="text-caption text-encre-3">{subtitle}</span>
      </span>
    </span>
  );
}

/** Tilted brass sticker on photos (social proof). Text on brass is white. */
export function Sticker({ before, figure, after, className }: { before: string; figure: ReactNode; after: string; className?: string }) {
  return (
    <span
      className={cx(
        "flex size-23 -rotate-10 flex-col items-center justify-center rounded-pill bg-laiton text-center text-micro font-bold text-blanc",
        className,
      )}
    >
      {before}
      <b className="font-title text-[1.75rem] leading-none font-extrabold">{figure}</b>
      {after}
    </span>
  );
}
