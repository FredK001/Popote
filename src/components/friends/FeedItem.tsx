import Link from "next/link";
import { RecipePhoto } from "@/components/recipe/RecipePhoto";
import { Avatar } from "@/components/ui/Avatar";
import type { ProfileColor } from "@/lib/recipes/types";
import { timeAgo } from "@/lib/time-ago";
import { format, t } from "@/messages";

export type FeedRow = {
  id: number;
  type: "published" | "adopted" | "cooked" | "variant";
  created_at: string;
  actor_id: string;
  actor_first_name: string;
  actor_avatar_color: ProfileColor;
  actor_avatar_url: string | null;
  recipe_id: string;
  recipe_title: string;
  recipe_photo_path: string | null;
  target_is_me: boolean | null;
  target_first_name: string | null;
  cook_photo_path: string | null;
};

export function feedText(row: FeedRow): string {
  const name = row.actor_first_name;
  switch (row.type) {
    case "published":
      return format(t.feed.published, { name });
    case "adopted":
      return row.target_is_me || !row.target_first_name
        ? format(t.feed.adoptedMine, { name })
        : format(t.feed.adopted, { name, target: row.target_first_name });
    case "cooked":
      return format(row.target_is_me ? t.feed.cookedMine : t.feed.cooked, { name });
    case "variant":
      return format(row.target_is_me ? t.feed.variantMine : t.feed.variant, { name });
  }
}

/** One line of the "Copains" feed: who did what, and the recipe as a card. */
export function FeedItem({ row, now }: { row: FeedRow; now: number }) {
  const photo = row.type === "cooked" && row.cook_photo_path ? row.cook_photo_path : row.recipe_photo_path;
  return (
    <li className="rounded-block border border-trait bg-surface p-3">
      <p className="flex items-center gap-3">
        <Avatar name={row.actor_first_name} tone={row.actor_avatar_color} photoUrl={row.actor_avatar_url} />
        <span className="flex-1">
          <span className="block font-semibold">{feedText(row)}</span>
          <span className="block text-caption text-encre-3">{format(t.feed.ago, { time: timeAgo(row.created_at, now) })}</span>
        </span>
      </p>
      <Link href={`/recette/${row.recipe_id}`} className="mt-3 flex items-center gap-3 rounded-card bg-fond p-2">
        <span className="relative size-16 flex-none overflow-hidden rounded-tag">
          <RecipePhoto path={photo} alt="" sizes="64px" />
        </span>
        <span className="flex-1 font-title text-h3 [overflow-wrap:anywhere]">{row.recipe_title}</span>
      </Link>
    </li>
  );
}
