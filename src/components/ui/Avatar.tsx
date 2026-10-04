import type { ReactNode } from "react";
import { SOLID_BG } from "@/lib/colors";
import { cx } from "@/lib/cx";
import type { ProfileColor } from "@/lib/recipes/types";

export type AvatarTone = ProfileColor | "encre-2";

const tones: Record<AvatarTone, string> = { ...SOLID_BG, "encre-2": "bg-encre-2" };

const sizes = {
  s: "size-7 text-caption",
  m: "size-10 text-body",
  l: "size-13 text-h2",
  xl: "size-20 text-h1",
};

type AvatarProps = {
  name: string;
  tone?: AvatarTone;
  size?: keyof typeof sizes;
  /** Photo URL; falls back to the initial on the colour. */
  photoUrl?: string | null;
  /** Overrides the initial (e.g. "+3"). */
  children?: ReactNode;
  className?: string;
};

export function Avatar({ name, tone = "tomate", size = "m", photoUrl, children, className }: AvatarProps) {
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- small remote avatar, any host (Google, Storage)
      <img
        src={photoUrl}
        alt={name}
        className={cx("flex-none rounded-pill border-[2.5px] border-surface object-cover", sizes[size], className)}
      />
    );
  }
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
