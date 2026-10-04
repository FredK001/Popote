"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { saveRecipe } from "@/app/(focus)/recette/actions";
import { PhotoUpload } from "@/components/notebook/PhotoUpload";
import { Button, IconButton } from "@/components/ui/Button";
import { CategoryChip } from "@/components/ui/CategoryChip";
import { Field } from "@/components/ui/Field";
import { Icon } from "@/components/ui/Icon";
import { categoryLabel, categoryPicto } from "@/lib/categories";
import { cx } from "@/lib/cx";
import { formatNumber, parseQuantity } from "@/lib/recipes/quantities";
import type { RecipeInput } from "@/lib/recipes/schema";
import type { Category, Difficulty, Ingredient, Recipe, Step } from "@/lib/recipes/types";
import { publicFileUrl } from "@/lib/storage";
import { format, t } from "@/messages";

const f = t.recipeForm;

const UNITS = ["g", "kg", "ml", "cl", "l", "c. à soupe", "c. à café", "pincée", "gousse", "tranche", "sachet", "boîte", "botte", "brin"];

type IngredientRow = {
  key: string;
  id: string | null;
  quantity: string;
  unit: string;
  name: string;
  ingredient_key: string | null;
  /** Name when the row was loaded: its picto key is kept only while the name is unchanged. */
  originalName: string;
};
type StepRow = { key: string; id: string | null; text: string; timer: string };

type RecipeFormProps = {
  userId: string;
  categories: Category[];
  initial?: {
    recipe: Recipe;
    ingredients: Ingredient[];
    steps: Step[];
    categoryId: string | null;
  };
  /** New recipe pre-filled from an AI draft or a link import. */
  prefill?: RecipeInput;
};

let keySeq = 0;
const newKey = () => `row-${++keySeq}`;

const emptyIngredient = (): IngredientRow => ({
  key: newKey(), id: null, quantity: "", unit: "", name: "", ingredient_key: null, originalName: "",
});
const emptyStep = (): StepRow => ({ key: newKey(), id: null, text: "", timer: "" });

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

const toInt = (v: string) => (v.trim() === "" ? null : Math.round(Number(v)));

export function RecipeForm({ userId, categories, initial, prefill }: RecipeFormProps) {
  const router = useRouter();
  const formId = useId();
  const r = initial?.recipe;
  const p = prefill;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(r?.title ?? p?.title ?? "");
  const [description, setDescription] = useState(r?.description ?? p?.description ?? "");
  const [photoPath, setPhotoPath] = useState<string | null>(r?.photo_path ?? p?.photo_path ?? null);
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? p?.category_id ?? null);
  const [servings, setServings] = useState(r?.servings ?? p?.servings ?? 4);
  const [prep, setPrep] = useState((r?.prep_minutes ?? p?.prep_minutes)?.toString() ?? "");
  const [cook, setCook] = useState((r?.cook_minutes ?? p?.cook_minutes)?.toString() ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty | null>(r?.difficulty ?? p?.difficulty ?? null);
  const [originLabel, setOriginLabel] = useState(r?.origin_label ?? p?.origin_label ?? "");
  const [originYear, setOriginYear] = useState(r?.origin_year?.toString() ?? "");
  const [sourceUrl, setSourceUrl] = useState(r?.source_url ?? p?.source_url ?? "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients.length
      ? initial.ingredients.map((i) => ({
          key: newKey(),
          id: i.id,
          quantity: i.quantity == null ? "" : formatNumber(i.quantity),
          unit: i.unit ?? "",
          name: i.name,
          ingredient_key: i.ingredient_key,
          originalName: i.name,
        }))
      : p?.ingredients.length
        ? p.ingredients.map((i) => ({
            key: newKey(),
            id: null,
            quantity: i.quantity == null ? "" : formatNumber(i.quantity),
            unit: i.unit ?? "",
            name: i.name,
            ingredient_key: i.ingredient_key ?? null,
            originalName: i.name,
          }))
        : [emptyIngredient(), emptyIngredient(), emptyIngredient()],
  );
  const [steps, setSteps] = useState<StepRow[]>(
    initial?.steps.length
      ? initial.steps.map((s) => ({
          key: newKey(),
          id: s.id,
          text: s.text,
          timer: s.timer_seconds ? String(Math.round(s.timer_seconds / 60)) : "",
        }))
      : p?.steps.length
        ? p.steps.map((s) => ({
            key: newKey(),
            id: null,
            text: s.text,
            timer: s.timer_seconds ? String(Math.round(s.timer_seconds / 60)) : "",
          }))
        : [emptyStep(), emptyStep()],
  );
  const [badQuantities, setBadQuantities] = useState<Set<string>>(new Set());

  const updateIngredient = (key: string, patch: Partial<IngredientRow>) =>
    setIngredients((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const updateStep = (key: string, patch: Partial<StepRow>) =>
    setSteps((list) => list.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  function submit() {
    setError(null);
    if (!title.trim()) return setError(f.errorTitle);

    const filledIngredients = ingredients.filter((i) => i.name.trim());
    const bad = new Set(filledIngredients.filter((i) => i.quantity.trim() && parseQuantity(i.quantity) == null).map((i) => i.key));
    setBadQuantities(bad);
    if (bad.size > 0) return setError(f.errorQuantity);
    if (filledIngredients.length === 0) return setError(f.errorIngredients);

    const filledSteps = steps.filter((s) => s.text.trim());
    if (filledSteps.length === 0) return setError(f.errorSteps);

    startTransition(async () => {
      const result = await saveRecipe({
        id: r?.id ?? null,
        title,
        description,
        servings,
        prep_minutes: toInt(prep),
        cook_minutes: toInt(cook),
        difficulty,
        photo_path: photoPath,
        source_url: sourceUrl.trim(),
        origin_label: originLabel,
        origin_year: toInt(originYear),
        category_id: categoryId,
        ingredients: filledIngredients.map((i) => ({
          id: i.id,
          quantity: parseQuantity(i.quantity),
          unit: i.unit,
          name: i.name,
          // Recomputed server-side when the name changed.
          ingredient_key: i.name === i.originalName ? i.ingredient_key : null,
        })),
        steps: filledSteps.map((s) => ({
          id: s.id,
          text: s.text,
          timer_seconds: toInt(s.timer) ? toInt(s.timer)! * 60 : null,
        })),
      });
      // On success the action redirects; we only get here on error.
      if (result?.error) setError(result.error);
    });
  }

  const photoUrl = publicFileUrl("recipe-photos", photoPath);

  return (
    <form
      id={formId}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-7 px-gutter pb-32"
    >
      {/* Photo */}
      <section className="space-y-3">
        <h2 className="text-h3">{f.photo}</h2>
        {photoUrl && (
          <div className="relative aspect-[4/3] overflow-hidden rounded-block">
            <Image src={photoUrl} alt="" fill sizes="(max-width: 430px) 100vw, 430px" className="object-cover" />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <PhotoUpload
            bucket="recipe-photos"
            userId={userId}
            label={photoUrl ? f.photoChange : f.photoAdd}
            busyLabel={f.photoUploading}
            errorLabel={f.photoError}
            onUploaded={setPhotoPath}
          />
          {photoUrl && (
            <Button variant="text" onClick={() => setPhotoPath(null)}>
              {f.photoRemove}
            </Button>
          )}
        </div>
      </section>

      <Field label={f.title} required maxLength={120} placeholder={f.titlePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} />

      <div>
        <label htmlFor={`${formId}-desc`} className="mb-2 block text-small font-semibold text-encre-2">
          {f.description}
        </label>
        <textarea
          id={`${formId}-desc`}
          rows={2}
          maxLength={2000}
          placeholder={f.descriptionPlaceholder}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-card border-[1.5px] border-trait bg-surface px-4 py-3 placeholder:text-encre-3 focus:border-encre"
        />
      </div>

      {/* Category */}
      <fieldset>
        <legend className="mb-2 text-small font-semibold text-encre-2">{f.category}</legend>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <CategoryChip
              key={c.id}
              tone={c.color_token}
              picto={categoryPicto(c)}
              active={categoryId === c.id}
              onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
            >
              {categoryLabel(c)}
            </CategoryChip>
          ))}
        </div>
      </fieldset>

      {/* Servings, times, difficulty */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <span id={`${formId}-servings`} className="mb-2 block text-small font-semibold text-encre-2">
            {f.servings}
          </span>
          <div role="group" aria-labelledby={`${formId}-servings`} className="flex items-center gap-4">
            <IconButton icon="minus" label={t.recipe.servingsLess} onClick={() => setServings((s) => Math.max(1, s - 1))} />
            <output className="min-w-8 text-center font-title text-h1" aria-live="polite">
              {servings}
            </output>
            <IconButton icon="plus" label={t.recipe.servingsMore} onClick={() => setServings((s) => Math.min(50, s + 1))} />
          </div>
        </div>
        <Field label={f.prep} type="number" inputMode="numeric" min={0} max={2880} value={prep} onChange={(e) => setPrep(e.target.value)} />
        <Field label={f.cook} type="number" inputMode="numeric" min={0} max={2880} value={cook} onChange={(e) => setCook(e.target.value)} />
      </div>

      <fieldset>
        <legend className="mb-2 text-small font-semibold text-encre-2">{f.difficulty}</legend>
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={difficulty === d}
              onClick={() => setDifficulty(difficulty === d ? null : d)}
              className={cx(
                "min-h-12 rounded-pill font-bold",
                difficulty === d ? "bg-sauge text-blanc" : "bg-sauge-soft text-sauge-ink",
              )}
            >
              {t.recipe.difficulty[d]}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Ingredients */}
      <section>
        <h2 className="mb-3 text-h2">{f.ingredients}</h2>
        <datalist id={`${formId}-units`}>
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <ol className="space-y-3">
          {ingredients.map((row, index) => (
            <li key={row.key} className="rounded-card bg-surface p-3">
              <div className="grid grid-cols-[5rem_6rem_1fr] gap-2">
                <MiniInput
                  label={f.ingredientQty}
                  inputMode="decimal"
                  value={row.quantity}
                  invalid={badQuantities.has(row.key)}
                  onChange={(v) => updateIngredient(row.key, { quantity: v })}
                />
                <MiniInput label={f.ingredientUnit} list={`${formId}-units`} value={row.unit} onChange={(v) => updateIngredient(row.key, { unit: v })} />
                <MiniInput
                  label={f.ingredientName}
                  placeholder={index === 0 ? f.ingredientNamePlaceholder : undefined}
                  value={row.name}
                  onChange={(v) => updateIngredient(row.key, { name: v })}
                />
              </div>
              <RowTools
                index={index}
                count={ingredients.length}
                removeLabel={format(f.ingredientRemove, { name: row.name || String(index + 1) })}
                onMove={(to) => setIngredients((list) => move(list, index, to))}
                onRemove={() => setIngredients((list) => list.filter((x) => x.key !== row.key))}
              />
            </li>
          ))}
        </ol>
        <Button variant="secondary" icon="plus" className="mt-3" onClick={() => setIngredients((l) => [...l, emptyIngredient()])}>
          {f.ingredientAdd}
        </Button>
      </section>

      {/* Steps */}
      <section>
        <h2 className="mb-3 text-h2">{f.steps}</h2>
        <ol className="space-y-3">
          {steps.map((row, index) => (
            <li key={row.key} className="rounded-card bg-surface p-3">
              <label className="block">
                <span className="mb-1 block text-small font-semibold text-encre-2">{format(t.recipe.stepN, { n: index + 1 })}</span>
                <textarea
                  rows={3}
                  maxLength={2000}
                  placeholder={index === 0 ? f.stepPlaceholder : undefined}
                  value={row.text}
                  onChange={(e) => updateStep(row.key, { text: e.target.value })}
                  className="w-full rounded-card border-[1.5px] border-trait bg-surface px-3 py-2 placeholder:text-encre-3 focus:border-encre"
                />
              </label>
              <div className="mt-2 flex items-end justify-between gap-2">
                <div className="w-36">
                  <MiniInput label={f.stepTimer} inputMode="numeric" type="number" value={row.timer} onChange={(v) => updateStep(row.key, { timer: v })} />
                </div>
                <RowTools
                  index={index}
                  count={steps.length}
                  removeLabel={format(f.stepRemove, { n: index + 1 })}
                  onMove={(to) => setSteps((list) => move(list, index, to))}
                  onRemove={() => setSteps((list) => list.filter((x) => x.key !== row.key))}
                />
              </div>
            </li>
          ))}
        </ol>
        <Button variant="secondary" icon="plus" className="mt-3" onClick={() => setSteps((l) => [...l, emptyStep()])}>
          {f.stepAdd}
        </Button>
      </section>

      {/* Origin */}
      <details className="rounded-card bg-surface p-4" open={Boolean(originLabel || sourceUrl)}>
        <summary className="min-h-tap cursor-pointer content-center font-bold">{f.more}</summary>
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-[1fr_6rem] gap-3">
            <Field label={f.originLabel} placeholder={f.originLabelPlaceholder} maxLength={80} value={originLabel} onChange={(e) => setOriginLabel(e.target.value)} />
            <Field label={f.originYear} type="number" inputMode="numeric" min={1800} max={2100} value={originYear} onChange={(e) => setOriginYear(e.target.value)} />
          </div>
          <Field label={f.sourceUrl} type="url" inputMode="url" placeholder="https://" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </div>
      </details>

      {/* Sticky save bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[398px] space-y-2">
          {error && (
            <p role="alert" className="flex items-start gap-2 text-small font-semibold text-erreur">
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}
          <div className="grid grid-cols-[1fr_2fr] gap-2.5">
            <Button variant="secondary" onClick={() => router.back()}>
              {f.cancel}
            </Button>
            <Button type="submit" icon="check" disabled={pending}>
              {pending ? f.saving : f.save}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

type MiniInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  list?: string;
  inputMode?: "decimal" | "numeric" | "text";
  type?: "text" | "number";
};

/** Compact labelled input for dense rows (ingredients, timers). */
function MiniInput({ label, value, onChange, invalid, placeholder, list, inputMode, type = "text" }: MiniInputProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-caption text-encre-3">{label}</span>
      <input
        type={type}
        value={value}
        list={list}
        inputMode={inputMode}
        placeholder={placeholder}
        aria-invalid={invalid || undefined}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "h-12 w-full min-w-0 rounded-card border-[1.5px] bg-surface px-3 placeholder:text-encre-3 focus:border-encre",
          invalid ? "border-erreur" : "border-trait",
        )}
      />
    </label>
  );
}

type RowToolsProps = {
  index: number;
  count: number;
  removeLabel: string;
  onMove: (to: number) => void;
  onRemove: () => void;
};

function RowTools({ index, count, removeLabel, onMove, onRemove }: RowToolsProps) {
  return (
    <div className="mt-2 flex justify-end gap-1">
      <IconButton icon="back" label={f.moveUp} className="rotate-90 border-0" disabled={index === 0} onClick={() => onMove(index - 1)} />
      <IconButton icon="back" label={f.moveDown} className="-rotate-90 border-0" disabled={index === count - 1} onClick={() => onMove(index + 1)} />
      <IconButton icon="x" label={removeLabel} className="border-0 text-erreur" onClick={onRemove} />
    </div>
  );
}
