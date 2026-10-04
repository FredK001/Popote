"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "@/lib/cx";
import { t } from "@/messages";
import { Icon, type IconName } from "./Icon";

type Tab = { href: string; label: string; icon: IconName; main?: boolean };

export const TABS: Tab[] = [
  { href: "/carnet", label: t.nav.notebook, icon: "carnet" },
  { href: "/copains", label: t.nav.friends, icon: "copains" },
  { href: "/ajouter", label: t.nav.add, icon: "plus", main: true },
  { href: "/une", label: t.nav.featured, icon: "une" },
  { href: "/profil", label: t.nav.profile, icon: "user" },
];

type TabBarProps = {
  /** Fixed to the viewport bottom (app) or inline (design system page). */
  fixed?: boolean;
  /** Overrides the active route (design system demo). */
  activeHref?: string;
};

export function TabBar({ fixed = true, activeHref }: TabBarProps) {
  const pathname = usePathname();
  const current = activeHref ?? pathname;

  return (
    <nav
      aria-label={t.nav.label}
      className={cx(
        "z-20 grid h-(--tabbar-height) grid-cols-5 border-t border-trait bg-surface px-1.5 pt-2 pb-[env(safe-area-inset-bottom)]",
        fixed ? "fixed inset-x-0 bottom-0" : "relative",
      )}
    >
      {TABS.map((tab) => {
        const active = !tab.main && current.startsWith(tab.href);
        if (tab.main) {
          return (
            <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-0.5 text-micro font-semibold text-encre">
              <span className="-mt-6.5 flex size-15 items-center justify-center rounded-pill border-4 border-surface bg-tomate text-blanc">
                <Icon name={tab.icon} size={28} strokeWidth={2.2} />
              </span>
              {tab.label}
            </Link>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "flex min-h-13 flex-col items-center gap-0.5 text-micro font-semibold",
              active ? "text-tomate-dark" : "text-encre-3",
            )}
          >
            <span className={cx("flex h-7.5 w-13.5 items-center justify-center rounded-pill", active && "bg-tomate-soft")}>
              <Icon name={tab.icon} />
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
