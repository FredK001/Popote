import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Logo } from "@/components/ui/Logo";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.offline.title, robots: { index: false } };

/** Precached by the service worker; shown for pages never opened before when offline. */
export default function OfflinePage() {
  return (
    <main className="mx-auto max-w-[430px] px-gutter pt-[max(1.5rem,env(safe-area-inset-top))]">
      <Logo />
      <EmptyState icon="refresh" title={t.offline.title} lead={t.offline.lead}>
        <Link href="/carnet" className={buttonClasses("primary", true)}>
          {t.offline.toNotebook}
        </Link>
      </EmptyState>
    </main>
  );
}
