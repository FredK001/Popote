import type { Metadata } from "next";
import { FocusHeader } from "@/components/recipe/FocusHeader";
import { RecipeForm } from "@/components/recipe/RecipeForm";
import { requireProfile } from "@/lib/auth";
import { getCategories } from "@/lib/recipes/queries";
import { t } from "@/messages";

export const metadata: Metadata = { title: t.recipeForm.newTitle };

export default async function NewRecipePage() {
  const profile = await requireProfile();
  const categories = await getCategories();
  return (
    <main>
      <FocusHeader title={t.recipeForm.newTitle} backHref="/carnet" />
      <RecipeForm userId={profile.id} categories={categories} />
    </main>
  );
}
