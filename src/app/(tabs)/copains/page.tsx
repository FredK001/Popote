import type { Metadata } from "next";
import Link from "next/link";
import { FeedItem, type FeedRow } from "@/components/friends/FeedItem";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.nav.friends };

const PAGE = 30;

export default async function FriendsPage({ searchParams }: PageProps<"/copains">) {
  const { avant } = await searchParams;
  const before = typeof avant === "string" && !Number.isNaN(Date.parse(avant)) ? avant : null;
  const supabase = await createClient();
  const [, { data, error }] = await Promise.all([
    requireProfile(),
    supabase.rpc("friends_feed", { p_limit: PAGE, p_before: before }),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as FeedRow[];
  // Request time, for "il y a 3 heures".
  // eslint-disable-next-line react-hooks/purity -- server component, rendered per request
  const now = Date.now();

  if (rows.length === 0 && !before) {
    return (
      <main>
        <EmptyState icon="copains" title={t.feed.emptyTitle} lead={t.feed.emptyLead}>
          <Link href="/carnet" className={buttonClasses("secondary")}>
            {t.feed.emptyAction}
          </Link>
        </EmptyState>
      </main>
    );
  }

  return (
    <main className="px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-8">
      <h1 className="font-title text-display">{t.feed.title}</h1>
      <p className="mt-1 text-encre-2">{t.feed.lead}</p>
      <ul className="mt-5 space-y-3">
        {rows.map((row) => (
          <FeedItem key={row.id} row={row} now={now} />
        ))}
      </ul>
      {rows.length === PAGE && (
        <Link href={`/copains?avant=${encodeURIComponent(rows[rows.length - 1].created_at)}`} className={buttonClasses("secondary", true, "mt-5")}>
          {t.feed.more}
        </Link>
      )}
    </main>
  );
}
