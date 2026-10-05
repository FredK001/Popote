import type { IconName } from "@/components/ui/Icon";

export type Stats = { written: number; cooked: number; adopted: number; friends: number; challenges: number; featured: number };

export type BadgeKey = "firstRecipe" | "tenRecipes" | "cook" | "traveller" | "friends" | "challenge" | "featured";

type BadgeDef = { key: BadgeKey; icon: IconName; stat: keyof Stats; goal: number };

/** Badges, in display order. Each one is earned when the counter reaches its goal. */
export const BADGES: BadgeDef[] = [
  { key: "firstRecipe", icon: "pen", stat: "written", goal: 1 },
  { key: "tenRecipes", icon: "carnet", stat: "written", goal: 10 },
  { key: "cook", icon: "cook", stat: "cooked", goal: 5 },
  { key: "traveller", icon: "share", stat: "adopted", goal: 5 },
  { key: "friends", icon: "copains", stat: "friends", goal: 3 },
  { key: "challenge", icon: "camera", stat: "challenges", goal: 1 },
  { key: "featured", icon: "une", stat: "featured", goal: 1 },
];

export type BadgeProgress = { key: BadgeKey; icon: IconName; earned: boolean; remaining: number };

export function badgeProgress(stats: Stats): BadgeProgress[] {
  return BADGES.map((b) => {
    const value = stats[b.stat] ?? 0;
    return { key: b.key, icon: b.icon, earned: value >= b.goal, remaining: Math.max(0, b.goal - value) };
  }).sort((a, b) => Number(b.earned) - Number(a.earned));
}
