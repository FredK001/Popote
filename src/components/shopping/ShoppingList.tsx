"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { addItem, clearItems, removeItem, setItemChecked } from "@/app/(focus)/courses/actions";
import { Button } from "@/components/ui/Button";
import { Icon, Picto } from "@/components/ui/Icon";
import { softTint } from "@/components/ui/IngredientTile";
import { cx } from "@/lib/cx";
import { ingredientPicto } from "@/lib/recipes/ingredient-picto";
import { formatQuantity } from "@/lib/recipes/quantities";
import { groupByAisle, type ShoppingItem } from "@/lib/shopping";
import { format, t } from "@/messages";

type Change = { type: "check"; id: string; checked: boolean } | { type: "remove"; id: string } | { type: "clear"; onlyChecked: boolean };

function apply(items: ShoppingItem[], change: Change): ShoppingItem[] {
  switch (change.type) {
    case "check":
      return items.map((i) => (i.id === change.id ? { ...i, checked: change.checked } : i));
    case "remove":
      return items.filter((i) => i.id !== change.id);
    case "clear":
      return change.onlyChecked ? items.filter((i) => !i.checked) : [];
  }
}

/** The shopping list, by aisle. Ticks are instant (optimistic), then saved. */
export function ShoppingList({ items: initial }: { items: ShoppingItem[] }) {
  const [items, change] = useOptimistic(initial, apply);
  const [, startTransition] = useTransition();
  const [adding, startAdding] = useTransition();
  const [error, setError] = useState(false);
  const [confirmAll, setConfirmAll] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = (optimistic: Change, action: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      change(optimistic);
      const result = await action();
      setError(Boolean(result.error));
    });

  const checkedCount = items.filter((i) => i.checked).length;

  return (
    <div className="px-gutter pb-16">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = input.current?.value.trim();
          if (!value) return;
          startAdding(async () => {
            const result = await addItem(value);
            setError(Boolean(result.error));
            if (!result.error && input.current) input.current.value = "";
          });
        }}
      >
        <label className="flex-1">
          <span className="sr-only">{t.shopping.addItem}</span>
          <input
            ref={input}
            maxLength={120}
            placeholder={t.shopping.addItemPlaceholder}
            className="h-12 w-full rounded-card border-[1.5px] border-trait bg-surface px-4 placeholder:text-encre-3 focus:border-encre"
          />
        </label>
        <Button type="submit" icon="plus" disabled={adding} aria-label={t.shopping.addItem} className="px-4">
          <span className="sr-only">{t.shopping.addItem}</span>
        </Button>
      </form>

      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {t.errors.generic}
        </p>
      )}

      {items.length === 0 ? (
        <div className="pt-12 text-center">
          <span className="mx-auto flex size-24 items-center justify-center rounded-pill bg-sauge-soft text-sauge-ink">
            <Icon name="cart" size={44} />
          </span>
          <h2 className="mt-5 font-title text-h1">{t.shopping.emptyTitle}</h2>
          <p className="mx-auto mt-2.5 max-w-[32ch] text-encre-2">{t.shopping.emptyLead}</p>
        </div>
      ) : (
        <>
          {groupByAisle(items).map((group) => (
            <section key={group.aisle} aria-labelledby={`aisle-${group.aisle}`} className="mt-6">
              <h2 id={`aisle-${group.aisle}`} className="mb-2 text-h3">
                {t.shopping.aisles[group.aisle]}
              </h2>
              <ul className="overflow-hidden rounded-card border border-trait bg-surface">
                {group.items.map((item) => {
                  const { picto, tint } = ingredientPicto(item.ingredient_key);
                  const qty = formatQuantity(item.quantity == null ? null : Number(item.quantity), item.unit);
                  return (
                    <li key={item.id} className="flex items-center gap-1 border-b border-trait last:border-b-0">
                      <label className="flex min-h-tap flex-1 cursor-pointer items-center gap-3 py-2 pl-3">
                        <input
                          type="checkbox"
                          checked={item.checked}
                          onChange={(e) => run({ type: "check", id: item.id, checked: e.target.checked }, () => setItemChecked(item.id, e.target.checked))}
                          aria-label={format(t.shopping.tick, { name: item.name })}
                          className="peer sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={cx(
                            "flex size-6 flex-none items-center justify-center rounded-pill border-2 peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bleu-nuit",
                            item.checked ? "border-sauge bg-sauge text-blanc" : "border-encre-3",
                          )}
                        >
                          {item.checked && <Icon name="check" size={14} strokeWidth={3} />}
                        </span>
                        <span className={cx("flex size-9 flex-none items-center justify-center rounded-tag", softTint[tint])}>
                          <Picto id={picto} width={26} />
                        </span>
                        <span className={cx("flex-1", item.checked && "text-encre-3 line-through")}>
                          {qty && <b className="font-semibold">{qty} </b>}
                          {item.name}
                        </span>
                      </label>
                      <button
                        type="button"
                        aria-label={format(t.shopping.remove, { name: item.name })}
                        onClick={() => run({ type: "remove", id: item.id }, () => removeItem(item.id))}
                        className="flex size-12 flex-none items-center justify-center text-encre-3"
                      >
                        <Icon name="x" size={18} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <div className="mt-8 space-y-2">
            {checkedCount > 0 && (
              <Button variant="secondary" block onClick={() => run({ type: "clear", onlyChecked: true }, () => clearItems(true))}>
                {t.shopping.clearChecked}
              </Button>
            )}
            {confirmAll ? (
              <div className="rounded-card bg-erreur-soft p-4">
                <p className="flex items-center gap-2 font-semibold text-erreur">
                  <Icon name="alert" />
                  {t.shopping.clearAllConfirm}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button variant="secondary" onClick={() => setConfirmAll(false)}>
                    {t.notebook.cancel}
                  </Button>
                  <Button
                    onClick={() => {
                      setConfirmAll(false);
                      run({ type: "clear", onlyChecked: false }, () => clearItems(false));
                    }}
                  >
                    {t.shopping.clearAll}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="text" block onClick={() => setConfirmAll(true)}>
                {t.shopping.clearAll}
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
