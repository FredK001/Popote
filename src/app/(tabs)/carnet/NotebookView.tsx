"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { ColorPicker } from "@/components/notebook/ColorPicker";
import { RecipePhoto } from "@/components/recipe/RecipePhoto";
import { Button, buttonClasses } from "@/components/ui/Button";
import { AddCategoryChip, CategoryChip } from "@/components/ui/CategoryChip";
import { Field } from "@/components/ui/Field";
import { Icon, Picto } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { categoryLabel, categoryPicto } from "@/lib/categories";
import { formatDuration } from "@/lib/recipes/format";
import type { NotebookItem } from "@/lib/recipes/queries";
import type { Category, ProfileColor } from "@/lib/recipes/types";
import { format, t } from "@/messages";
import { createCategory, type CategoryState } from "./actions";

type Props = {
  items: NotebookItem[];
  categories: Category[];
  userId: string;
};

const ALL = "all";

/** Search, recently opened, category chips and the recipe list. */
export function NotebookView({ items, categories, userId }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>(ALL);
  const [adding, setAdding] = useState(false);

  const recent = useMemo(
    () =>
      items
        .filter((i) => i.lastOpenedAt)
        .sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""))
        .slice(0, 8),
    [items],
  );

  const visible = useMemo(() => {
    const q = normalize(query);
    return items.filter(
      (i) => (active === ALL || i.categoryId === active) && (!q || normalize(i.title).includes(q)),
    );
  }, [items, active, query]);

  return (
    <>
      <div className="mt-4.5 px-gutter">
        <Field
          label={t.notebook.search}
          hideLabel
          icon="search"
          type="search"
          placeholder={t.notebook.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {recent.length > 0 && !query && (
        <section aria-labelledby="recent-title">
          <h2 id="recent-title" className="px-gutter pt-5 text-h3">
            {t.notebook.recent}
          </h2>
          <ul className="flex snap-x gap-4 overflow-x-auto px-gutter pt-3.5 pb-1 [scrollbar-width:none]">
            {recent.map((item) => (
              <li key={item.recipeId} className="w-35 flex-none snap-start">
                <Link href={`/recette/${item.recipeId}`} className="block">
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-card">
                    <RecipePhoto path={item.photoPath} alt="" sizes="140px" />
                  </span>
                  <span className="mt-2 block text-small font-semibold leading-tight">{item.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div
        role="group"
        aria-label={t.notebook.categoryFilter}
        className="mt-5 flex gap-2 overflow-x-auto px-gutter py-1.5 [scrollbar-width:none]"
      >
        <CategoryChip tone="encre" picto="c-tout" active={active === ALL} onClick={() => setActive(ALL)}>
          {t.notebook.all}
        </CategoryChip>
        {categories.map((c) => (
          <CategoryChip
            key={c.id}
            tone={c.color_token}
            picto={categoryPicto(c)}
            active={active === c.id}
            onClick={() => setActive(c.id)}
          >
            {categoryLabel(c)}
          </CategoryChip>
        ))}
        <AddCategoryChip label={t.notebook.newCategory} onClick={() => setAdding(true)} />
      </div>

      <ul className="px-gutter pt-2">
        {visible.map((item) => (
          <li key={item.recipeId}>
            <Link href={`/recette/${item.recipeId}`} className="flex min-h-tap items-center gap-3.5 border-b border-trait py-3">
              <span className="relative size-16 flex-none overflow-hidden rounded-card">
                <RecipePhoto path={item.photoPath} alt="" sizes="64px" />
              </span>
              <span className="min-w-0">
                <span className="block font-title text-h3 font-bold tracking-[-0.01em]">{item.title}</span>
                <span className="mt-1 flex items-center gap-2.5 text-small text-encre-3">
                  <span>
                    {item.authorId === userId
                      ? t.notebook.byYou
                      : item.authorName && format(t.recipe.from, { name: item.authorName })}
                  </span>
                  {item.totalMinutes && (
                    <span className="flex items-center gap-1">
                      <Icon name="clock" size={15} />
                      {formatDuration(item.totalMinutes)}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {visible.length === 0 && (
        <p className="px-gutter py-8 text-center text-encre-2">{query ? t.notebook.noResult : t.notebook.emptyCategory}</p>
      )}

      <NewCategorySheet
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(id) => {
          setAdding(false);
          setActive(id);
        }}
      />
    </>
  );
}

function NewCategorySheet({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [state, action, pending] = useActionState<CategoryState, FormData>(createCategory, {});
  const [color, setColor] = useState<ProfileColor>("sauge");

  useEffect(() => {
    if (state.createdId) onCreated(state.createdId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react only to a new creation
  }, [state.createdId]);

  return (
    <Sheet open={open} onClose={onClose} title={t.notebook.newCategory}>
      <form action={action} className="space-y-5">
        <Field label={t.notebook.newCategoryName} name="name" required maxLength={40} error={state.error} />
        <ColorPicker legend={t.notebook.newCategoryColor} name="color_token" value={color} onChange={setColor} />
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            {t.notebook.cancel}
          </Button>
          <Button type="submit" disabled={pending} className="flex-1">
            {t.notebook.createCategory}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** Empty notebook: illustration and one clear way out. */
export function EmptyNotebook() {
  return (
    <div className="px-6 pt-7 text-center">
      <Picto id="ill-vide" width={200} height={145} className="mx-auto block" />
      <h2 className="mt-3 font-title text-h1">{t.notebook.emptyTitle}</h2>
      <p className="mx-auto mt-2.5 mb-5.5 max-w-[30ch] text-encre-2">{t.notebook.emptyLead}</p>
      <Link href="/recette/nouvelle" className={buttonClasses("primary", true)}>
        <Icon name="plus" />
        {t.notebook.emptyAdd}
      </Link>
    </div>
  );
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}
