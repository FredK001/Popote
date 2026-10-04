import type { ReactNode } from "react";
import { cx } from "@/lib/cx";
import { Icon } from "./Icon";

type ToastProps = {
  children: ReactNode;
  visible?: boolean;
  /** Pin to the bottom of the screen, above the tab bar. */
  floating?: boolean;
};

export function Toast({ children, visible = true, floating }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "flex max-w-90 items-center gap-3 rounded-card bg-encre px-4 py-3.5 font-semibold text-blanc transition-[opacity,transform] duration-250",
        floating && "fixed inset-x-4 bottom-30 z-40 mx-auto",
        visible ? "opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      {visible && (
        <>
          <Icon name="check" className="text-succes-on-dark" />
          {children}
        </>
      )}
    </div>
  );
}
