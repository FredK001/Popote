"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { findFromFridge } from "@/app/(focus)/frigo/actions";
import { RecipePhoto } from "@/components/recipe/RecipePhoto";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { parseFridgeInput, type FridgeMatch } from "@/lib/fridge";
import { format, t } from "@/messages";

/** Ingredient chips, then the recipes that use them (fewest missing first). */
export function FridgeSearch() {
  const [draft, setDraft] = useState("");
  const [have, setHave] = useState<string[]>([]);
  const [matches, setMatches] = useState<FridgeMatch[] | null>(null);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function addDraft(): string[] {
    const next = [...have];
    for (const item of parseFridgeInput(draft)) if (!next.some((h) => h.toLowerCase() === item.toLowerCase())) next.push(item);
    setHave(next);
    setDraft("");
    return next;
  }

  function search() {
    const list = draft.trim() ? addDraft() : have;
    if (list.length === 0) return;
    startTransition(async () => {
      const result = await findFromFridge(list);
      setError(Boolean(result.error));
      setMatches(result.matches ?? null);
    });
  }

  return (
    <div className="px-gutter pb-16">
      <p className="text-encre-2">{t.fridge.lead}</p>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addDraft();
        }}
      >
        <label className="flex-1">
          <span className="sr-only">{t.fridge.label}</span>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t.fridge.placeholder}
            maxLength={300}
            className="h-12 w-full rounded-card border-[1.5px] border-trait bg-surface px-4 placeholder:text-encre-3 focus:border-encre"
          />
        </label>
        <Button type="submit" variant="secondary" icon="plus" aria-label={t.fridge.add} className="px-4">
          <span className="sr-only">{t.fridge.add}</span>
        </Button>
      </form>

      {have.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={t.fridge.label}>
          {have.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => setHave(have.filter((h) => h !== item))}
                aria-label={format(t.fridge.remove, { name: item })}
                className="tap-target inline-flex h-9 items-center gap-1.5 rounded-pill bg-sauge-soft pr-2.5 pl-3.5 font-semibold text-sauge-ink"
              >
                {item}
                <Icon name="x" size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button icon="search" block className="mt-4" disabled={pending || (have.length === 0 && !draft.trim())} onClick={search}>
        {pending ? t.common.loading : t.fridge.search}
      </Button>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {t.errors.generic}
        </p>
      )}

      {matches && (
        <section aria-labelledby="fridge-results" aria-live="polite" className="mt-8">
          <h2 id="fridge-results" className="mb-2 text-h2">
            {t.fridge.resultsTitle}
          </h2>
          {matches.length === 0 ? (
            <p className="text-encre-2">{t.fridge.none}</p>
          ) : (
            <ul className="space-y-2.5">
              {matches.map((m) => (
                <li key={m.recipe.id}>
                  <Link href={`/recette/${m.recipe.id}`} className="flex items-center gap-3 rounded-card border border-trait bg-surface p-3">
                    <span className="relative size-16 flex-none overflow-hidden rounded-tag">
                      <RecipePhoto path={m.recipe.photo_path} alt="" sizes="64px" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-title text-h3 [overflow-wrap:anywhere]">{m.recipe.title}</span>
                      <span className="block text-caption text-encre-3">
                        {m.recipe.author_first_name ? format(t.fridge.fromFriend, { name: m.recipe.author_first_name }) : t.fridge.fromMine}
                      </span>
                      <span className={m.missing.length ? "mt-0.5 block text-small text-encre-2" : "mt-0.5 block text-small font-semibold text-sauge-ink"}>
                        {m.missing.length ? format(t.fridge.missing, { list: m.missing.join(", ") }) : t.fridge.complete}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="mt-8 rounded-card bg-laiton-soft p-4 text-small text-laiton-ink">{t.fridge.aiTip}</p>
    </div>
  );
}
