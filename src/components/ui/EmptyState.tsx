import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Calm placeholder: tinted round icon, title, one line, optional action. */
export function EmptyState({ icon, title, lead, children }: { icon: IconName; title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="px-6 pt-16 text-center">
      <span className="mx-auto flex size-24 items-center justify-center rounded-pill bg-sauge-soft text-sauge-ink">
        <Icon name={icon} size={44} />
      </span>
      <h1 className="mt-5 font-title text-h1">{title}</h1>
      {lead && <p className="mx-auto mt-2.5 max-w-[32ch] text-encre-2">{lead}</p>}
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}
