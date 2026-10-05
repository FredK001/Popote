import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { RecipePhoto } from "@/components/recipe/RecipePhoto";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/ui/Icon";
import { Seal } from "@/components/ui/Seal";
import { requireProfile } from "@/lib/auth";
import { challengeFor } from "@/lib/challenges";
import { formatDuration } from "@/lib/recipes/format";
import type { ProfileColor } from "@/lib/recipes/types";
import { publicFileUrl } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";
import { format, t } from "@/messages";

export const metadata: Metadata = { title: t.nav.featured };

type FeaturedRow = {
  id: string;
  title: string;
  photo_path: string | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  author_first_name: string;
  author_avatar_color: ProfileColor;
  author_avatar_url: string | null;
  score: number;
};

type EntryRow = {
  id: string;
  photo_path: string;
  first_name: string;
  recipe_id: string | null;
  recipe_title: string | null;
};

export default async function FeaturedPage() {
  const challenge = challengeFor();
  const supabase = await createClient();
  const [, week, shared, entries] = await Promise.all([
    requireProfile(),
    supabase.rpc("featured_recipes", { p_kind: "week", p_days: 7, p_limit: 1 }),
    supabase.rpc("featured_recipes", { p_kind: "shared", p_days: 30, p_limit: 10 }),
    supabase.rpc("challenge_entries", { p_key: challenge.key, p_limit: 12 }),
  ]);
  const top = ((week.data ?? []) as FeaturedRow[])[0];
  const mostShared = ((shared.data ?? []) as FeaturedRow[]).filter((r) => r.id !== top?.id);
  const photos = (entries.data ?? []) as EntryRow[];

  return (
    <main className="px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-8">
      <h1 className="font-title text-display">{t.featured.title}</h1>
      <p className="mt-1 text-encre-2">{t.featured.lead}</p>

      {top ? (
        <section aria-labelledby="week-title" className="mt-5">
          <h2 id="week-title" className="sr-only">
            {t.featured.week}
          </h2>
          <Link href={`/recette/${top.id}`} className="block overflow-hidden rounded-block border border-trait bg-surface">
            <span className="relative block aspect-[4/3]">
              <RecipePhoto path={top.photo_path} alt="" sizes="430px" priority />
              <span className="absolute top-3 left-3 -rotate-3">
                <Seal tone="laiton" compact>
                  {t.featured.week}
                </Seal>
              </span>
            </span>
            <span className="block p-4">
              <span className="block font-title text-h1 [overflow-wrap:anywhere]">{top.title}</span>
              <span className="mt-2 flex items-center gap-2.5 text-small text-encre-2">
                <Avatar name={top.author_first_name} tone={top.author_avatar_color} photoUrl={top.author_avatar_url} size="s" />
                {format(t.featured.weekBy, { name: top.author_first_name })}
                {formatDuration((top.prep_minutes ?? 0) + (top.cook_minutes ?? 0)) && (
                  <span className="flex items-center gap-1 text-encre-3">
                    <Icon name="clock" size={15} />
                    {formatDuration((top.prep_minutes ?? 0) + (top.cook_minutes ?? 0))}
                  </span>
                )}
              </span>
            </span>
          </Link>
        </section>
      ) : (
        <section className="mt-5 rounded-block bg-laiton-soft p-5 text-laiton-ink">
          <h2 className="text-h3">{t.featured.emptyTitle}</h2>
          <p className="mt-1 text-small">{t.featured.emptyLead}</p>
        </section>
      )}

      <section aria-labelledby="challenge-title" className="mt-6 rounded-block bg-sauge-soft p-5 text-sauge-ink">
        <p className="text-caption font-bold uppercase tracking-[0.06em]">{t.challenge.label}</p>
        <h2 id="challenge-title" className="mt-1 font-title text-h1">
          {challenge.title}
        </h2>
        <p className="mt-1 text-small">{challenge.lead}</p>
        <p className="mt-3 text-small font-semibold">{t.challenge.lead}</p>
        {photos.length === 0 ? (
          <p className="mt-3 text-small">{t.challenge.none}</p>
        ) : (
          <>
            <p className="mt-3 text-caption font-semibold">
              {photos.length === 1 ? t.challenge.entryOne : format(t.challenge.entries, { n: photos.length })}
            </p>
            <ul className="mt-2 grid grid-cols-3 gap-2">
              {photos.map((entry) => {
                const img = (
                  <>
                    <span className="relative block aspect-square overflow-hidden rounded-tag bg-surface">
                      <Image src={publicFileUrl("recipe-photos", entry.photo_path)!} alt={format(t.challenge.photoAlt, { name: entry.first_name })} fill sizes="130px" className="object-cover" />
                    </span>
                    <span className="mt-1 block truncate text-caption font-semibold">{entry.first_name}</span>
                  </>
                );
                return (
                  <li key={entry.id}>
                    {entry.recipe_id ? (
                      <Link href={`/recette/${entry.recipe_id}`} aria-label={`${entry.first_name} : ${entry.recipe_title}`} className="block">
                        {img}
                      </Link>
                    ) : (
                      img
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {mostShared.length > 0 && (
        <section aria-labelledby="shared-title" className="mt-8">
          <h2 id="shared-title" className="mb-2 text-h2">
            {t.featured.mostShared}
          </h2>
          <ol className="overflow-hidden rounded-card border border-trait bg-surface">
            {mostShared.map((r, i) => (
              <li key={r.id} className="border-b border-trait last:border-b-0">
                <Link href={`/recette/${r.id}`} className="flex min-h-tap items-center gap-3 p-3">
                  <span aria-hidden="true" className="w-5 text-center font-title text-h3 text-encre-3">
                    {i + 1}
                  </span>
                  <span className="relative size-14 flex-none overflow-hidden rounded-tag">
                    <RecipePhoto path={r.photo_path} alt="" sizes="56px" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-title text-h3 [overflow-wrap:anywhere]">{r.title}</span>
                    <span className="block text-small text-encre-3">
                      {format(t.featured.weekBy, { name: r.author_first_name })} · {r.score === 1 ? t.featured.adoptionOne : format(t.featured.adoptions, { n: r.score })}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}
    </main>
  );
}
