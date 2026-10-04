import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export type AvatarTone = "tomate" | "sauge" | "prune" | "bleu-nuit" | "laiton" | "encre-2";

const tones: Record<AvatarTone, string> = {
  tomate: "bg-tomate",
  sauge: "bg-sauge",
  prune: "bg-prune",
  "bleu-nuit": "bg-bleu-nuit",
  laiton: "bg-laiton",
  "encre-2": "bg-encre-2",
};

const sizes = {
  s: "size-7 text-caption",
  m: "size-10 text-body",
  l: "size-13 text-h2",
};

type AvatarProps = {
  name: string;
  tone?: AvatarTone;
  size?: keyof typeof sizes;
  /** Overrides the initial (e.g. "+3"). */
  children?: ReactNode;
  className?: string;
};

export function Avatar({ name, tone = "tomate", size = "m", children, className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cx(
        "inline-flex flex-none items-center justify-center rounded-pill border-[2.5px] border-surface font-bold text-blanc",
        tones[tone],
        sizes[size],
        className,
      )}
    >
      {children ?? <span aria-hidden="true">{name.charAt(0).toUpperCase()}</span>}
      {!children && <span className="sr-only">{name}</span>}
    </span>
  );
}

export function AvatarStack({ children }: { children: ReactNode }) {
  return <span className="flex [&>*:not(:first-child)]:-ml-2.5">{children}</span>;
}
