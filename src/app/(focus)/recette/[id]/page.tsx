import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecipeSheetView } from "@/components/recipe/RecipeSheetView";
import { requireProfile } from "@/lib/auth";
import { categoryLabel } from "@/lib/categories";
import { buildLineage, type GenealogyRow } from "@/lib/recipes/genealogy";
import { getCategories, getRecipeSheet } from "@/lib/recipes/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/recette/[id]">): Promise<Metadata> {
  const { id } = await params;
  const profile = await requireProfile();
  const sheet = await getRecipeSheet(id, profile.id);
  return { title: sheet?.recipe.title };
}

export default async function RecipePage({ params, searchParams }: PageProps<"/recette/[id]">) {
  const { id } = await params;
  const { ajoutee } = await searchParams;
  const profile = await requireProfile();
  const [sheet, categories] = await Promise.all([getRecipeSheet(id, profile.id), getCategories()]);
  if (!sheet) notFound();

  const supabase = await createClient();
  const [{ data: genealogy }, { data: reach }] = await Promise.all([
    supabase.rpc("my_recipe_genealogy", { p_recipe_id: id }),
    supabase.rpc("recipe_reach", { p_recipe_id: id }),
    // Feeds "Ouvertes récemment" on the notebook.
    sheet.entry
      ? supabase
          .from("notebook_entries")
          .update({ last_opened_at: new Date().toISOString() })
          .eq("recipe_id", id)
          .eq("user_id", profile.id)
      : Promise.resolve(),
  ]);

  const category = categories.find((c) => c.id === sheet.entry?.category_id);
  const lineage = buildLineage({
    rows: (genealogy ?? []) as GenealogyRow[],
    originLabel: sheet.recipe.origin_label,
    originYear: sheet.recipe.origin_year,
    viewerId: profile.id,
  });

  return (
    <main>
      <RecipeSheetView
        sheet={sheet}
        userId={profile.id}
        userName={profile.first_name}
        category={category ? { label: categoryLabel(category), tone: category.color_token } : null}
        lineage={lineage}
        onward={(reach as Array<{ onward: number }> | null)?.[0]?.onward ?? 0}
        justAdded={ajoutee === "1"}
      />
    </main>
  );
}
