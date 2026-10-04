import type { Metadata } from "next";
import Link from "next/link";
import { LineageChain } from "@/components/recipe/Lineage";
import { RecipePhoto } from "@/components/recipe/RecipePhoto";
import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { IngredientTile } from "@/components/ui/IngredientTile";
import { Logo } from "@/components/ui/Logo";
import { InfoPill } from "@/components/ui/Pills";
import { Sticker } from "@/components/ui/Seal";
import { getUserId } from "@/lib/auth";
import { formatDuration, formatServings } from "@/lib/recipes/format";
import { buildLineage } from "@/lib/recipes/genealogy";
import { ingredientPicto } from "@/lib/recipes/ingredient-picto";
import { formatQuantity } from "@/lib/recipes/quantities";
import { claimPath } from "@/lib/share-token";
import { getPublicShare } from "@/lib/shares";
import { createClient } from "@/lib/supabase/server";
import { timeAgo } from "@/lib/time-ago";
import { format, t } from "@/messages";

export async function generateMetadata({ params }: PageProps<"/r/[token]">): Promise<Metadata> {
  const { token } = await params;
  const share = await getPublicShare(token);
  if (!share) return { title: t.publicRecipe.notFoundTitle, robots: { index: false } };
  const description = share.message ?? format(t.publicRecipe.metaDescription, { name: share.sender.firstName });
  return {
    title: share.recipe.title,
    description,
    // Private links: never indexed.
    robots: { index: false, follow: false },
    openGraph: { type: "article", title: share.recipe.title, description, locale: "fr_FR" },
    twitter: { card: "summary_large_image", title: share.recipe.title, description },
  };
}

/**
 * Shared recipe, readable in full without an account. The only ask is the
 * "Ajouter à mon carnet" bar, always visible at the bottom.
 */
export default async function SharedRecipePage({ params }: PageProps<"/r/[token]">) {
  const { token } = await params;
  const share = await getPublicShare(token);

  if (!share) {
    return (
      <main className="mx-auto max-w-[430px] px-gutter pt-6">
        <Logo />
        <EmptyState icon="link" title={t.publicRecipe.notFoundTitle} lead={t.publicRecipe.notFoundLead} />
      </main>
    );
  }

  const { recipe, sender } = share;
  const userId = await getUserId();
  let alreadyIn = false;
  if (userId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("notebook_entries")
      .select("recipe_id")
      .eq("user_id", userId)
      .eq("recipe_id", recipe.id)
      .maybeSingle();
    alreadyIn = Boolean(data);
  }

  const lineage = buildLineage({
    rows: share.lineage,
    originLabel: recipe.origin_label,
    originYear: recipe.origin_year,
    invite: !alreadyIn,
    viewerId: userId,
  });
  const total = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  const senderIsAuthor = sender.id === recipe.author_id;
  const addHref = claimPath(share.token);

  return (
    <main className="mx-auto max-w-[430px] pb-44">
      <header className="flex items-center justify-between px-gutter pt-[max(0.875rem,env(safe-area-inset-top))]">
        <Logo />
        {!userId && (
          <Link href={`/connexion?next=${encodeURIComponent(addHref)}`} className={buttonClasses("text")}>
            {t.publicRecipe.alreadyHave}
          </Link>
        )}
      </header>

      {/* Who sends it, and why */}
      <section className="mx-gutter mt-4 rounded-block bg-surface p-4">
        <div className="flex items-center gap-3">
          <Avatar name={sender.firstName} tone={sender.color} size="l" photoUrl={sender.photoUrl} />
          <div>
            <p className="font-bold">
              {format(senderIsAuthor ? t.publicRecipe.sends : t.publicRecipe.sendsReceived, { name: sender.firstName })}
            </p>
            <p className="text-caption text-encre-3">{format(t.publicRecipe.ago, { time: timeAgo(share.createdAt) })}</p>
          </div>
        </div>
        {share.message && (
          <p className="mt-3 rounded-[4px_18px_18px_18px] bg-tomate px-3.5 py-3 text-blanc whitespace-pre-line">{share.message}</p>
        )}
      </section>

      <div className="relative mx-gutter mt-5">
        <div className="relative aspect-[4/3] overflow-hidden rounded-block">
          <RecipePhoto path={recipe.photo_path} alt={recipe.title} sizes="390px" priority />
        </div>
        {share.adopted >= 2 && (
          <Sticker
            className="absolute -top-3.5 -right-2"
            before={t.recipe.adoptedBy}
            figure={share.adopted}
            after={t.recipe.friendsWord}
          />
        )}
      </div>

      <article className="px-gutter pt-6">
        <h1 className="font-title text-display [overflow-wrap:anywhere]">{recipe.title}</h1>
        {recipe.description && <p className="mt-3 text-encre-2">{recipe.description}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          {total > 0 && <InfoPill kind="time">{formatDuration(total)}</InfoPill>}
          {recipe.difficulty && <InfoPill kind="difficulty">{t.recipe.difficulty[recipe.difficulty]}</InfoPill>}
          <InfoPill kind="servings">{formatServings(recipe.servings)}</InfoPill>
        </div>

        {lineage.length > 1 && <LineageChain nodes={lineage} />}

        <h2 className="mt-8 mb-2 flex items-baseline justify-between text-h2">
          {t.recipe.ingredients}
          <small className="text-small font-medium text-encre-3">{format(t.recipe.for, { n: recipe.servings })}</small>
        </h2>
        <ul className="grid grid-cols-2 gap-2.5">
          {share.ingredients.map((ing) => {
            const { picto, tint } = ingredientPicto(ing.ingredient_key);
            return (
              <li key={ing.id}>
                <IngredientTile picto={picto} tint={tint} quantity={formatQuantity(ing.quantity, ing.unit) || "–"} name={ing.name} />
              </li>
            );
          })}
        </ul>

        <h2 className="mt-8 mb-2 text-h2">{t.recipe.steps}</h2>
        <ol>
          {share.steps.map((step, index) => (
            <li key={step.id} className="grid grid-cols-[2.25rem_1fr] gap-3 py-3">
              <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[10px] bg-tomate-soft font-bold text-tomate-dark">
                {index + 1}
              </span>
              <p className="whitespace-pre-line">
                <span className="sr-only">{format(t.recipe.stepN, { n: index + 1 })} : </span>
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-surface px-gutter pt-3.5 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
        <div className="mx-auto max-w-[390px]">
          {alreadyIn ? (
            <Link href={`/recette/${recipe.id}`} className={buttonClasses("added", true)}>
              <Icon name="check" />
              {t.publicRecipe.open}
            </Link>
          ) : (
            <>
              <Link href={addHref} className={buttonClasses("primary", true)}>
                <Icon name="addbook" />
                {t.publicRecipe.add}
              </Link>
              {!userId && <p className="mt-2.5 text-small text-encre-3">{t.publicRecipe.addHint}</p>}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
