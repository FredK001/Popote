import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { requireProfile } from "@/lib/auth";
import { getCategories, getRecipeSheet } from "@/lib/recipes/queries";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.recipeForm.editTitle };

export default async function EditRecipePage({ params }: PageProps<"/recette/[id]/modifier">) {
  const { id } = await params;
  const profile = await requireProfile();
  const [sheet, categories] = await Promise.all([getRecipeSheet(id, profile.id), getCategories()]);
  // Only the author edits; others will create a variant (phase 5).
  if (!sheet || sheet.recipe.author_id !== profile.id || sheet.recipe.deleted_at) notFound();

  return (
    <main>
      <FocusHeader title={t.recipeForm.editTitle} backHref={`/recette/${id}`} />
      <RecipeForm
        userId={profile.id}
        categories={categories}
        initial={{
          recipe: sheet.recipe,
          ingredients: sheet.ingredients,
          steps: sheet.steps,
          categoryId: sheet.entry?.category_id ?? null,
        }}
      />
    </main>
  );
}
