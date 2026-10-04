import Link from "next/link";
import { t } from "@/messages";
import { Icon } from "@/components/ui/Icon";

/** Top bar of full-screen tasks: back link and title. */
export function FocusHeader({ title, backHref }: { title: string; backHref: string }) {
  return (
    <header className="flex items-center gap-3 px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-4">
      <Link
        href={backHref}
        aria-label={t.common.back}
        className="inline-flex size-12 flex-none items-center justify-center rounded-pill border border-trait bg-surface"
      >
        <Icon name="back" />
      </Link>
      <h1 className="font-title text-h1">{title}</h1>
    </header>
  );
}
