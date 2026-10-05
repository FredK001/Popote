import type { Metadata } from "next";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { requireProfile } from "@/lib/auth";
import { getCategories, getRecipeSheet } from "@/lib/recipes/queries";
import type { RecipeInput } from "@/lib/recipes/schema";
import { format, t } from "@/messages";

export const metadata: Metadata = { title: t.recipeForm.newTitle };

export default async function NewRecipePage({ searchParams }: PageProps<"/recette/nouvelle">) {
  const [profile, categories, { variante }] = await Promise.all([requireProfile(), getCategories(), searchParams]);

  // "Créer ma variante": start from a copy of a recipe the user can read.
  const source = typeof variante === "string" ? await getRecipeSheet(variante, profile.id).catch(() => null) : null;
  const prefill: RecipeInput | undefined = source
    ? {
        title: source.recipe.title,
        description: source.recipe.description,
        servings: source.recipe.servings,
        prep_minutes: source.recipe.prep_minutes,
        cook_minutes: source.recipe.cook_minutes,
        difficulty: source.recipe.difficulty,
        variant_of: source.recipe.id,
        ingredients: source.ingredients.map((i) => ({ quantity: i.quantity, unit: i.unit, name: i.name, ingredient_key: i.ingredient_key })),
        steps: source.steps.map((s) => ({ text: s.text, timer_seconds: s.timer_seconds })),
      }
    : undefined;

  return (
    <main>
      <FocusHeader title={source ? t.variants.create : t.recipeForm.newTitle} backHref={source ? `/recette/${source.recipe.id}` : "/carnet"} />
      {source && <p className="-mt-2 mb-4 px-gutter text-small text-encre-2">{format(t.variants.of, { title: source.recipe.title })}</p>}
      <RecipeForm userId={profile.id} categories={categories} prefill={prefill} />
    </main>
  );
}
