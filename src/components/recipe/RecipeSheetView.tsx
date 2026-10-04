"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteRecipe, removeFromNotebook, saveNote, saveOverrides } from "@/app/(focus)/recette/actions";
import { Avatar } from "@/components/ui/Avatar";
import { Confetti, type ConfettiHandle } from "@/components/ui/Confetti";
import { categoryTint, type CategoryTone } from "@/components/ui/CategoryChip";
import { Button, buttonClasses, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { IngredientTile, MiseEnPlace } from "@/components/ui/IngredientTile";
import { Seal } from "@/components/ui/Seal";
import { Sheet } from "@/components/ui/Sheet";
import { Toast } from "@/components/ui/Toast";
import { cx } from "@/lib/cx";
import { formatDuration } from "@/lib/recipes/format";
import { ingredientPicto } from "@/lib/recipes/ingredient-picto";
import { formatNumber, formatQuantity, parseQuantity, scaleQuantity } from "@/lib/recipes/quantities";
import { isInterestingLineage, type LineageNode } from "@/lib/recipes/genealogy";
import type { RecipeSheet } from "@/lib/recipes/queries";
import { format, t } from "@/messages";
import { AddPhotoBanner } from "./AddPhotoBanner";
import { LineageStory } from "./Lineage";
import { RecipePhoto } from "./RecipePhoto";
import { ShareSheet } from "./ShareSheet";
import { StepTimerButton } from "./StepTimerButton";
import { useTimers } from "./useTimers";

type Props = {
  sheet: RecipeSheet;
  userId: string;
  userName: string;
  category: { label: string; tone: CategoryTone } | null;
  lineage: LineageNode[];
  onward: number;
  /** Just added from a share link: confetti and a toast. */
  justAdded: boolean;
  /** Arrived from an AI connector: invite to add the dish photo. */
  askPhoto: boolean;
};

export function RecipeSheetView({ sheet, userId, userName, category, lineage, onward, justAdded, askPhoto }: Props) {
  const router = useRouter();
  const { recipe, ingredients, steps, author, entry } = sheet;
  const isAuthor = recipe.author_id === userId;
  const base = recipe.servings;

  const [servings, setServings] = useState(base);
  const [bump, setBump] = useState(0);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [toast, setToast] = useState<{ text: string; sticky: boolean } | null>(
    justAdded ? { text: format(t.publicRecipe.added, { title: recipe.title }), sticky: false } : null,
  );
  const confetti = useRef<ConfettiHandle>(null);

  useEffect(() => {
    if (!justAdded) return;
    confetti.current?.burst();
    // Drop ?ajoutee=1 so a reload does not celebrate again.
    router.replace(`/recette/${recipe.id}`, { scroll: false });
  }, [justAdded, recipe.id, router]);
  const overrides = entry?.quantity_overrides ?? {};

  // A finished timer stays on screen until dismissed; other confirmations fade after 3 s.
  const onTimerDone = useCallback((label: string) => setToast({ text: format(t.recipe.timerDone, { label }), sticky: true }), []);
  const timers = useTimers(onTimerDone);

  useEffect(() => {
    if (!toast || toast.sticky) return;
    const id = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(id);
  }, [toast]);

  function changeServings(delta: number) {
    setServings((s) => Math.min(50, Math.max(1, s + delta)));
    setBump((b) => b + 1);
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const total = (recipe.prep_minutes ?? 0) + (recipe.cook_minutes ?? 0);
  const done = checked.size;

  return (
    <>
      {/* Hero */}
      <div className="relative h-82.5 overflow-hidden">
        <RecipePhoto path={recipe.photo_path} alt={recipe.title} sizes="430px" priority />
        <div className="absolute inset-x-4 top-[max(1rem,env(safe-area-inset-top))] flex justify-between">
          <Link
            href="/carnet"
            aria-label={t.common.back}
            className="inline-flex size-12 items-center justify-center rounded-pill bg-surface"
          >
            <Icon name="back" />
          </Link>
          <IconButton icon="more" label={t.common.more} className="border-0" onClick={() => setMenuOpen(true)} />
        </div>
      </div>

      <article className="relative -mt-7 rounded-t-[28px] bg-fond px-gutter pt-6 pb-36">
        {entry && (
          <div className="absolute right-4.5 -top-12.5">
            <Seal compact>{t.recipe.inNotebook}</Seal>
          </div>
        )}

        {category && (
          <span className={cx("inline-flex h-7 items-center rounded-tag px-2.5 text-small font-semibold", categoryTint(category.tone))}>
            {category.label}
          </span>
        )}
        <h1 className="mt-2.5 pr-5 font-title text-display [overflow-wrap:anywhere]">{recipe.title}</h1>

        {author && (
          <p className="mt-3 flex items-center gap-2.5 text-small text-encre-2">
            <Avatar name={author.first_name} tone={author.avatar_color} size="s" photoUrl={author.avatar_url} />
            <span>
              {isAuthor ? t.notebook.byYou : format(t.recipe.recipeBy, { name: author.first_name })}
              {recipe.origin_label && (
                <>
                  {" · "}
                  {recipe.origin_year
                    ? format(t.recipe.originYear, { label: recipe.origin_label, year: recipe.origin_year })
                    : format(t.recipe.origin, { label: recipe.origin_label })}
                </>
              )}
            </span>
          </p>
        )}
        {recipe.description && <p className="mt-3 text-encre-2">{recipe.description}</p>}

        {askPhoto && isAuthor && !recipe.photo_path && <AddPhotoBanner recipeId={recipe.id} userId={userId} />}

        {/* Facts: time apricot, difficulty sage, servings brass */}
        <div className="mt-5 grid grid-cols-[1fr_1fr_1.3fr] gap-2">
          <div className="rounded-card bg-abricot-soft px-3 py-2.5 text-abricot-ink">
            <div className="text-caption font-semibold">{t.recipe.time}</div>
            <div className="mt-0.5 font-bold">{formatDuration(total) ?? "–"}</div>
          </div>
          <div className="rounded-card bg-sauge-soft px-3 py-2.5 text-sauge-ink">
            <div className="text-caption font-semibold">{t.recipe.difficultyLabel}</div>
            <div className="mt-0.5 flex items-center gap-1.5 font-bold">
              {recipe.difficulty ? (
                <>
                  <span aria-hidden="true" className="flex gap-0.75">
                    {[1, 2, 3].map((d) => (
                      <i key={d} className={cx("block size-2 rounded-pill", d <= recipe.difficulty! ? "bg-sauge-ink" : "bg-sauge-ink/25")} />
                    ))}
                  </span>
                  {t.recipe.difficulty[recipe.difficulty]}
                </>
              ) : (
                "–"
              )}
            </div>
          </div>
          <div className="rounded-card bg-laiton-soft px-3 py-2.5 text-laiton-ink">
            <div className="text-caption font-semibold" id="servings-label">
              {t.recipe.parts}
            </div>
            <div role="group" aria-labelledby="servings-label" className="mt-0.5 flex items-center justify-between">
              <button
                type="button"
                aria-label={t.recipe.servingsLess}
                onClick={() => changeServings(-1)}
                disabled={servings <= 1}
                className="tap-target flex size-8 items-center justify-center rounded-pill bg-laiton text-blanc disabled:bg-fond-2 disabled:text-encre-3"
              >
                <Icon name="minus" size={16} strokeWidth={2.4} />
              </button>
              <output aria-live="polite" className="text-h3 font-bold">
                {servings}
              </output>
              <button
                type="button"
                aria-label={t.recipe.servingsMore}
                onClick={() => changeServings(1)}
                disabled={servings >= 50}
                className="tap-target flex size-8 items-center justify-center rounded-pill bg-laiton text-blanc disabled:bg-fond-2 disabled:text-encre-3"
              >
                <Icon name="plus" size={16} strokeWidth={2.4} />
              </button>
            </div>
          </div>
        </div>

        {/* Ingredients */}
        <h2 className="mt-8 mb-2 flex items-baseline justify-between text-h2">
          {t.recipe.ingredients}
          <small className="text-small font-medium text-encre-3">{format(t.recipe.for, { n: servings })}</small>
        </h2>
        <MiseEnPlace
          done={done}
          total={ingredients.length}
          label={t.recipe.miseEnPlace}
          count={done === ingredients.length ? t.recipe.miseEnPlaceDone : format(t.recipe.miseEnPlaceCount, { done, total: ingredients.length })}
        />
        <ul className="mt-3 grid grid-cols-2 gap-2.5">
          {ingredients.map((ing) => {
            const { picto, tint } = ingredientPicto(ing.ingredient_key);
            const scaled = ing.quantity == null ? null : scaleQuantity(ing.quantity, ing.unit, base, servings);
            const mine = overrides[ing.id];
            const scaledMine = mine == null ? null : scaleQuantity(mine, ing.unit, base, servings);
            return (
              <li key={ing.id}>
                <IngredientTile
                  picto={picto}
                  tint={tint}
                  quantity={formatQuantity(scaled, ing.unit) || "–"}
                  myQuantity={scaledMine == null ? undefined : formatQuantity(scaledMine, ing.unit)}
                  name={ing.name}
                  bump={bump}
                  checked={checked.has(ing.id)}
                  onToggle={() => toggle(ing.id)}
                  checkLabel={format(t.recipe.tickIngredient, { name: ing.name })}
                />
              </li>
            );
          })}
        </ul>
        {entry && (
          <Button variant="secondary" icon="pen" block className="mt-3" onClick={() => setVersionOpen(true)}>
            {t.recipe.myVersion}
          </Button>
        )}

        {entry && <PersonalNote recipeId={recipe.id} initial={entry.personal_note ?? ""} />}

        {/* Steps */}
        <h2 className="mt-8 mb-2 text-h2">{t.recipe.steps}</h2>
        <ol>
          {steps.map((step, index) => (
            <li key={step.id} className="grid grid-cols-[2.25rem_1fr] gap-3 py-3">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-[10px] bg-tomate-soft font-bold text-tomate-dark"
              >
                {index + 1}
              </span>
              <div>
                <span className="sr-only">{format(t.recipe.stepN, { n: index + 1 })} : </span>
                <p className="whitespace-pre-line">{step.text}</p>
                {step.timer_seconds && (
                  <StepTimerButton
                    seconds={step.timer_seconds}
                    remaining={timers.remaining(step.id)}
                    onStart={() => timers.start(step.id, step.timer_seconds!, format(t.recipe.stepN, { n: index + 1 }))}
                    onStop={() => timers.stop(step.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ol>

        {isInterestingLineage(lineage) && <LineageStory nodes={lineage} onward={onward} />}

        {recipe.source_url && (
          <p className="mt-6 text-small text-encre-2">
            {t.recipe.source} :{" "}
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-tomate-dark underline underline-offset-3">
              {new URL(recipe.source_url).hostname.replace(/^www\./, "")}
            </a>
          </p>
        )}
      </article>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="relative mx-auto grid max-w-[398px] grid-cols-2 gap-2.5">
          <Link href={`/recette/${recipe.id}/cuisine?parts=${servings}`} className={buttonClasses("secondary", false, "whitespace-nowrap")}>
            <Icon name="cook" />
            {t.cook.short}
          </Link>
          <Button icon="share" onClick={() => setShareOpen(true)}>
            {t.share.button}
          </Button>
          <Confetti ref={confetti} />
        </div>
      </div>

      <Toast floating visible={toast != null}>
        <span className="flex-1">{toast?.text}</span>
        <button type="button" onClick={() => setToast(null)} aria-label={t.common.close} className="tap-target">
          <Icon name="x" size={18} />
        </button>
      </Toast>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        onShared={(copied) => {
          setShareOpen(false);
          if (copied) setToast({ text: t.share.copied, sticky: false });
        }}
        recipeId={recipe.id}
        title={recipe.title}
        senderName={userName}
      />

      <RecipeMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        recipeId={recipe.id}
        title={recipe.title}
        isAuthor={isAuthor}
        inNotebook={Boolean(entry)}
      />

      {entry && (
        <MyVersionSheet
          open={versionOpen}
          onClose={() => setVersionOpen(false)}
          onSaved={() => {
            setVersionOpen(false);
            setToast({ text: t.recipe.saved, sticky: false });
            router.refresh();
          }}
          recipeId={recipe.id}
          servings={base}
          ingredients={ingredients}
          overrides={overrides}
        />
      )}
    </>
  );
}

function PersonalNote({ recipeId, initial }: { recipeId: string; initial: string }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-4 block w-full rounded-card bg-laiton-soft p-4 text-left"
      >
        <span className="block text-note text-encre whitespace-pre-line">
          {saved || <span className="text-laiton-ink">{t.recipe.notePlaceholder}</span>}
        </span>
        <span className="mt-2 flex items-center gap-1.5 text-caption text-laiton-ink">
          <Icon name="pen" size={14} />
          {t.recipe.personalNote}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-card bg-laiton-soft p-4">
      <label className="block">
        <span className="mb-2 block text-small font-semibold text-laiton-ink">{t.recipe.note}</span>
        <textarea
          rows={4}
          maxLength={2000}
          autoFocus
          value={note}
          placeholder={t.recipe.notePlaceholder}
          onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-card border-[1.5px] border-trait bg-surface px-3 py-2 text-note placeholder:text-encre-3 focus:border-encre"
        />
      </label>
      {error && (
        <p role="alert" className="mt-2 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {t.errors.generic}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setNote(saved);
            setEditing(false);
          }}
        >
          {t.notebook.cancel}
        </Button>
        <Button
          variant="brass"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await saveNote(recipeId, note);
              setError(Boolean(result.error));
              if (!result.error) {
                setSaved(note.trim());
                setEditing(false);
              }
            })
          }
        >
          {t.recipe.noteSave}
        </Button>
      </div>
    </div>
  );
}

type MyVersionProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  recipeId: string;
  servings: number;
  ingredients: RecipeSheet["ingredients"];
  overrides: Record<string, number>;
};

function MyVersionSheet({ open, onClose, onSaved, recipeId, servings, ingredients, overrides }: MyVersionProps) {
  const withQty = ingredients.filter((i) => i.quantity != null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(withQty.map((i) => [i.id, overrides[i.id] != null ? formatNumber(overrides[i.id]) : ""])),
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save(next: Record<string, string>) {
    const parsed: Record<string, number> = {};
    for (const [id, raw] of Object.entries(next)) {
      if (!raw.trim()) continue;
      const n = parseQuantity(raw);
      if (n == null) return setError(t.recipeForm.errorQuantity);
      parsed[id] = n;
    }
    setError(null);
    startTransition(async () => {
      const result = await saveOverrides(recipeId, parsed);
      if (result.error) setError(result.error);
      else onSaved();
    });
  }

  return (
    <Sheet open={open} onClose={onClose} title={t.recipe.myVersionTitle}>
      <p className="mb-4 text-small text-encre-2">{format(t.recipe.myVersionLead, { n: servings })}</p>
      <ul className="space-y-2">
        {withQty.map((ing) => (
          <li key={ing.id}>
            <label className="grid grid-cols-[1fr_7rem] items-center gap-3 rounded-card bg-surface p-3">
              <span>
                <span className="block font-semibold">{ing.name}</span>
                <span className="text-small text-encre-3">{formatQuantity(ing.quantity, ing.unit)}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <input
                  inputMode="decimal"
                  value={values[ing.id] ?? ""}
                  placeholder={formatNumber(ing.quantity!)}
                  onChange={(e) => setValues((v) => ({ ...v, [ing.id]: e.target.value }))}
                  className="h-12 w-full min-w-0 rounded-card border-[1.5px] border-trait bg-surface px-3 placeholder:text-encre-3 focus:border-encre"
                />
                {ing.unit && <span className="text-small text-encre-2">{ing.unit}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-caption text-encre-3">{t.recipe.myVersionHint}</p>
      {error && (
        <p role="alert" className="mt-3 flex items-center gap-1.5 text-small font-semibold text-erreur">
          <Icon name="alert" size={16} />
          {error}
        </p>
      )}
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Button
          variant="secondary"
          disabled={pending}
          onClick={() => {
            const cleared = Object.fromEntries(Object.keys(values).map((k) => [k, ""]));
            setValues(cleared);
            save(cleared);
          }}
        >
          {t.recipe.myVersionReset}
        </Button>
        <Button variant="brass" disabled={pending} onClick={() => save(values)}>
          {t.recipe.save}
        </Button>
      </div>
    </Sheet>
  );
}

type MenuProps = {
  open: boolean;
  onClose: () => void;
  recipeId: string;
  title: string;
  isAuthor: boolean;
  inNotebook: boolean;
};

function RecipeMenu({ open, onClose, recipeId, title, isAuthor, inNotebook }: MenuProps) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);

  const run = (action: () => Promise<{ error?: string }>) =>
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(true);
    });

  return (
    <Sheet
      open={open}
      onClose={() => {
        setConfirming(false);
        onClose();
      }}
      title={title}
    >
      <div className="space-y-3">
        {isAuthor && (
          <Link href={`/recette/${recipeId}/modifier`} className={buttonClasses("secondary", true)}>
            <Icon name="pen" />
            {t.recipe.edit}
          </Link>
        )}
        {isAuthor && !confirming && (
          <Button variant="text" block onClick={() => setConfirming(true)}>
            {t.recipe.deleteRecipe}
          </Button>
        )}
        {isAuthor && confirming && (
          <div className="rounded-card bg-erreur-soft p-4">
            <p className="flex items-start gap-2 font-semibold text-erreur">
              <Icon name="alert" />
              {format(t.recipe.deleteConfirm, { title })}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)}>
                {t.notebook.cancel}
              </Button>
              <Button disabled={pending} onClick={() => run(() => deleteRecipe(recipeId))}>
                {t.recipe.deleteRecipe}
              </Button>
            </div>
          </div>
        )}
        {!isAuthor && inNotebook && (
          <Button variant="secondary" block disabled={pending} onClick={() => run(() => removeFromNotebook(recipeId))}>
            {t.recipe.removeFromNotebook}
          </Button>
        )}
        {error && (
          <p role="alert" className="flex items-center gap-1.5 text-small font-semibold text-erreur">
            <Icon name="alert" size={16} />
            {t.errors.generic}
          </p>
        )}
      </div>
    </Sheet>
  );
}
