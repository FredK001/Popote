"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Sheet } from "@/components/ui/Sheet";
import { Toast } from "@/components/ui/Toast";
import { formatQuantity, scaleQuantity } from "@/lib/recipes/quantities";
import type { RecipeSheet } from "@/lib/recipes/queries";
import { format, t } from "@/messages";
import { StepTimerButton } from "./StepTimerButton";
import { useTimers } from "./useTimers";
import { useWakeLock } from "./useWakeLock";

type Props = { sheet: RecipeSheet; servings: number };

/** Full screen, one step at a time, very large text, big buttons, built-in timers, screen kept on. */
export function CookMode({ sheet, servings }: Props) {
  const router = useRouter();
  const { recipe, steps, ingredients, entry } = sheet;
  const [index, setIndex] = useState(0);
  const [showIngredients, setShowIngredients] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const wakeLock = useWakeLock();
  const onTimerDone = useCallback((label: string) => setToast(format(t.recipe.timerDone, { label })), []);
  const timers = useTimers(onTimerDone);

  const step = steps[index];
  const last = index === steps.length - 1;
  const backHref = `/recette/${recipe.id}`;

  const go = useCallback((delta: number) => setIndex((i) => Math.min(steps.length - 1, Math.max(0, i + delta))), [steps.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  const overrides = entry?.quantity_overrides ?? {};

  return (
    <div className="flex min-h-dvh flex-col bg-fond px-gutter pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <header className="flex items-center justify-between gap-3">
        <Link
          href={backHref}
          aria-label={t.cook.exit}
          className="inline-flex size-14 items-center justify-center rounded-pill border border-trait bg-surface"
        >
          <Icon name="x" size={26} />
        </Link>
        <p className="text-h3" aria-live="polite">
          {format(t.cook.progress, { n: index + 1, total: steps.length })}
        </p>
        <button
          type="button"
          onClick={() => setShowIngredients(true)}
          aria-label={t.cook.showIngredients}
          className="inline-flex size-14 items-center justify-center rounded-pill border border-trait bg-surface"
        >
          <Icon name="plate" size={26} />
        </button>
      </header>

      <div className="mt-4 flex gap-1" aria-hidden="true">
        {steps.map((s, i) => (
          <i key={s.id} className={`block h-2 flex-1 rounded-tag ${i <= index ? "bg-tomate" : "bg-fond-2"}`} />
        ))}
      </div>

      <h1 className="mt-6 font-title text-h1">{recipe.title}</h1>

      <section className="flex flex-1 flex-col justify-center py-8">
        <p className="text-cook whitespace-pre-line">{step?.text}</p>
        {step?.timer_seconds && (
          <div className="mt-8">
            <StepTimerButton
              large
              seconds={step.timer_seconds}
              remaining={timers.remaining(step.id)}
              onStart={() => timers.start(step.id, step.timer_seconds!, format(t.recipe.stepN, { n: index + 1 }))}
              onStop={() => timers.stop(step.id)}
            />
          </div>
        )}
      </section>

      {wakeLock === "unavailable" && <p className="mb-3 text-small text-encre-3">{t.cook.wakeLockOff}</p>}

      <nav className="grid grid-cols-2 gap-3" aria-label={t.cook.title}>
        <Button variant="secondary" className="min-h-18 text-h2" disabled={index === 0} onClick={() => go(-1)}>
          <Icon name="back" size={26} />
          <span className="sr-only">{t.cook.previous}</span>
        </Button>
        {last ? (
          <Button className="min-h-18 text-h2" icon="check" onClick={() => router.push(backHref)}>
            {t.cook.finish}
          </Button>
        ) : (
          <Button className="min-h-18 text-h2" onClick={() => go(1)}>
            {t.cook.next}
          </Button>
        )}
      </nav>

      <Toast floating visible={toast != null}>
        <span className="flex-1 text-h3">{toast}</span>
        <button type="button" onClick={() => setToast(null)} aria-label={t.common.close} className="tap-target">
          <Icon name="x" size={20} />
        </button>
      </Toast>

      <Sheet open={showIngredients} onClose={() => setShowIngredients(false)} title={t.cook.ingredientsTitle}>
        <p className="mb-3 text-small text-encre-3">{format(t.recipe.for, { n: servings })}</p>
        <ul className="divide-y divide-trait rounded-card bg-surface px-4">
          {ingredients.map((ing) => {
            const base = overrides[ing.id] ?? ing.quantity;
            const qty = base == null ? null : scaleQuantity(base, ing.unit, recipe.servings, servings);
            return (
              <li key={ing.id} className="flex gap-3 py-3 text-h3">
                <b className="min-w-20 font-bold">{formatQuantity(qty, ing.unit)}</b>
                <span className="font-medium">{ing.name}</span>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </div>
  );
}
