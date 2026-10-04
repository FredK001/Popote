import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeSheetView } from "@/components/recipe/RecipeSheetView";
import { requireProfile } from "@/lib/auth";
import { categoryLabel } from "@/lib/categories";
import { getCategories, getRecipeSheet } from "@/lib/recipes/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/recette/[id]">): Promise<Metadata> {
  const { id } = await params;
  const profile = await requireProfile();
  const sheet = await getRecipeSheet(id, profile.id);
  return { title: sheet?.recipe.title };
}

export default async function RecipePage({ params }: PageProps<"/recette/[id]">) {
  const { id } = await params;
  const profile = await requireProfile();
  const [sheet, categories] = await Promise.all([getRecipeSheet(id, profile.id), getCategories()]);
  if (!sheet) notFound();

  // Feeds "Ouvertes récemment" on the notebook.
  if (sheet.entry) {
    const supabase = await createClient();
    await supabase
      .from("notebook_entries")
      .update({ last_opened_at: new Date().toISOString() })
      .eq("recipe_id", id)
      .eq("user_id", profile.id);
  }

  const category = categories.find((c) => c.id === sheet.entry?.category_id);

  return (
    <main>
      <RecipeSheetView
        sheet={sheet}
        userId={profile.id}
        category={category ? { label: categoryLabel(category), tone: category.color_token } : null}
      />
    </main>
  );
}
