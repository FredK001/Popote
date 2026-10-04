import type { ReactNode } from "react";
import { SOLID_BG } from "@/lib/colors";
import { cx } from "@/lib/cx";
import type { ProfileColor } from "@/lib/recipes/types";

type NotebookCoverProps = {
  color: ProfileColor;
  title: string;
  subtitle: string;
  /** Round picture top-right: avatar or last recipe. */
  corner?: ReactNode;
};

/** Big flat block in the user's colour, with two translucent circles as decoration. */
export function NotebookCover({ color, title, subtitle, corner }: NotebookCoverProps) {
  return (
    <div className={cx("relative flex min-h-42 items-end overflow-hidden rounded-block p-5.5 text-blanc", SOLID_BG[color])}>
      <span aria-hidden="true" className="absolute -right-17.5 -bottom-27.5 size-52.5 rounded-pill bg-blanc/12" />
      <span aria-hidden="true" className="absolute right-24 -top-7.5 size-18.5 rounded-pill border-12 border-blanc/16" />
      {corner && <span className="absolute right-5 top-5">{corner}</span>}
      <div className="relative max-w-[66%]">
        <p className="font-title text-[1.875rem] leading-[1.1] font-extrabold tracking-[-0.02em] [overflow-wrap:anywhere]">{title}</p>
        <p className="mt-1 text-body">{subtitle}</p>
      </div>
    </div>
  );
}
