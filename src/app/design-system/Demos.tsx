"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { AddCategoryChip, CategoryChip, type CategoryTone } from "@/components/ui/CategoryChip";
import { Confetti, type ConfettiHandle } from "@/components/ui/Confetti";
import type { PictoId } from "@/components/ui/Icon";
import { IngredientTile, MiseEnPlace, type SoftTone } from "@/components/ui/IngredientTile";
import { Seal } from "@/components/ui/Seal";
import { Toast } from "@/components/ui/Toast";
import { format, t } from "@/messages";

const s = t.designSystem.sample;

const CATEGORIES: Array<{ key: keyof typeof s.categories; tone: CategoryTone; picto: PictoId }> = [
  { key: "all", tone: "encre", picto: "c-tout" },
  { key: "mains", tone: "tomate", picto: "c-plat" },
  { key: "starters", tone: "sauge", picto: "c-entree" },
  { key: "desserts", tone: "prune", picto: "c-dessert" },
  { key: "apero", tone: "laiton", picto: "c-apero" },
  { key: "brunch", tone: "abricot", picto: "c-brunch" },
];

export function CategoriesDemo() {
  const [active, setActive] = useState<string>("mains");
  return (
    <div className="flex flex-wrap items-center gap-2 py-1">
      {CATEGORIES.map((c) => (
        <CategoryChip key={c.key} tone={c.tone} picto={c.picto} active={active === c.key} onClick={() => setActive(c.key)}>
          {s.categories[c.key]}
        </CategoryChip>
      ))}
      <AddCategoryChip label={s.categories.addCategory} />
    </div>
  );
}

const TINTS: Record<string, SoftTone> = {
  pate: "laiton", pomme: "tomate", creme: "ciel", sucre: "prune", beurre: "abricot", cannelle: "sauge",
};

export function IngredientsDemo() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bump, setBump] = useState(0);
  const done = checked.size;
  const total = s.ingredients.length;

  function toggle(key: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-3">
      <MiseEnPlace
        done={done}
        total={total}
        label={t.recipe.miseEnPlace}
        count={done === total ? t.recipe.miseEnPlaceDone : format(t.recipe.miseEnPlaceCount, { done, total })}
      />
      <ul className="grid grid-cols-2 gap-2.5">
        {s.ingredients.map((ing) => (
          <li key={ing.key}>
            <IngredientTile
              picto={`g-${ing.key}`}
              tint={TINTS[ing.key]}
              quantity={ing.qty}
              myQuantity={"note" in ing ? ing.note : undefined}
              name={ing.name}
              bump={bump}
              checked={checked.has(ing.key)}
              onToggle={() => toggle(ing.key)}
              checkLabel={format(t.recipe.tickIngredient, { name: ing.name })}
            />
          </li>
        ))}
      </ul>
      <Button variant="secondary" icon="refresh" onClick={() => setBump((b) => b + 1)}>
        {s.bump}
      </Button>
    </div>
  );
}

export function MotionDemo() {
  const confetti = useRef<ConfettiHandle>(null);
  const [added, setAdded] = useState(0);

  function add() {
    confetti.current?.burst();
    setAdded((n) => n + 1);
  }

  return (
    <div className="space-y-4">
      <div className="relative inline-block">
        <Confetti ref={confetti} />
        <Button icon="addbook" onClick={add}>
          {t.recipe.addToNotebook}
        </Button>
      </div>
      <div className="flex min-h-24 items-center gap-4">
        {added > 0 && (
          <Seal key={added} animate>
            {t.recipe.inNotebook}
          </Seal>
        )}
        <Toast visible={added > 0}>{format(t.recipe.addedToast, { title: s.recipeTitle })}</Toast>
      </div>
    </div>
  );
}
