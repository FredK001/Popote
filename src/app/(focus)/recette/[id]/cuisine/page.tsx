import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CookMode } from "@/components/recipe/CookMode";
import { requireProfile } from "@/lib/auth";
import { getRecipeSheet } from "@/lib/recipes/queries";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.cook.title };

export default async function CookPage({ params, searchParams }: PageProps<"/recette/[id]/cuisine">) {
  const { id } = await params;
  const { parts } = await searchParams;
  const profile = await requireProfile();
  const sheet = await getRecipeSheet(id, profile.id);
  if (!sheet || sheet.steps.length === 0) notFound();

  const requested = Number(typeof parts === "string" ? parts : NaN);
  const servings = Number.isInteger(requested) && requested >= 1 && requested <= 50 ? requested : sheet.recipe.servings;

  return <CookMode sheet={sheet} servings={servings} />;
}
