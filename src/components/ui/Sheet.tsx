"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { t } from "@/messages";
import { IconButton } from "./Button";

type SheetProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/** Modal bottom sheet on a native <dialog>: focus trap, Escape and backdrop for free. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className="mx-auto mt-auto mb-0 max-h-[90dvh] w-full max-w-[430px] overflow-y-auto rounded-t-block bg-fond p-0 text-encre backdrop:bg-encre/50"
    >
      <div className="px-gutter pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-title text-h1">{title}</h2>
          <IconButton icon="x" label={t.common.close} onClick={onClose} />
        </div>
        {children}
      </div>
    </dialog>
  );
}
