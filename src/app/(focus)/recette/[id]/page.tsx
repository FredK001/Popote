import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import type { RecipeCook } from "@/components/recipe/Cooked";
import { RecipeSheetView, type RecipeVariant } from "@/components/recipe/RecipeSheetView";
import { getProfile, getUserId } from "@/lib/auth";
import { categoryLabel } from "@/lib/categories";
import { challengeFor } from "@/lib/challenges";
import { buildLineage, type GenealogyRow } from "@/lib/recipes/genealogy";
import { getCategories, getRecipeSheet } from "@/lib/recipes/queries";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/recette/[id]">): Promise<Metadata> {
  const { id } = await params;
  const userId = await getUserId();
  const sheet = userId ? await getRecipeSheet(id, userId) : null;
  return { title: sheet?.recipe.title };
}

export default async function RecipePage({ params, searchParams }: PageProps<"/recette/[id]">) {
  const [{ id }, { ajoutee, photo }, userId] = await Promise.all([params, searchParams, getUserId()]);
  if (!userId) redirect(`/connexion?next=${encodeURIComponent(`/recette/${id}`)}`);

  // Everything in one parallel round trip: the database is far from the server (EU vs US),
  // so each sequential query costs ~100 ms.
  const supabase = await createClient();
  const [profile, sheet, categories, { data: genealogy }, { data: reach }, { data: cooks }, { data: variants }] = await Promise.all([
    getProfile(),
    getRecipeSheet(id, userId),
    getCategories(),
    supabase.rpc("my_recipe_genealogy", { p_recipe_id: id }),
    supabase.rpc("recipe_reach", { p_recipe_id: id }),
    supabase.rpc("recipe_cooks", { p_recipe_id: id }),
    supabase.rpc("recipe_variants", { p_recipe_id: id }),
  ]);
  if (!profile) redirect("/connexion");
  if (!profile.onboarded_at) redirect("/bienvenue");
  if (!sheet) notFound();

  // Feeds "Ouvertes récemment" on the notebook, after the response is sent.
  if (sheet.entry) {
    after(async () => {
      await supabase
        .from("notebook_entries")
        .update({ last_opened_at: new Date().toISOString() })
        .eq("recipe_id", id)
        .eq("user_id", userId);
    });
  }

  // Only for variants: the original's title (RLS hides it when not readable).
  const { data: source } = sheet.recipe.variant_of
    ? await supabase.from("recipes").select("id, title").eq("id", sheet.recipe.variant_of).maybeSingle()
    : { data: null };

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
        cooks={(cooks ?? []) as RecipeCook[]}
        variants={(variants ?? []) as RecipeVariant[]}
        variantSource={source}
        challengeTitle={challengeFor().title}
        justAdded={ajoutee === "1"}
        askPhoto={photo === "1"}
      />
    </main>
  );
}
