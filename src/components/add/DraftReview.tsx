"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { categoryTint } from "@/components/ui/CategoryChip";
import { Icon } from "@/components/ui/Icon";
import { InfoPill } from "@/components/ui/Pills";
import { pointsToCheck, type RecipeDraft } from "@/lib/ai/schema";
import { answerQuestion, chooseFieldValue, chooseIngredientQuantity } from "@/lib/ai/to-recipe";
import { cx } from "@/lib/cx";
import { formatDuration } from "@/lib/recipes/format";
import { formatQuantity } from "@/lib/recipes/quantities";
import { format, t } from "@/messages";

const a = t.add;

const CATEGORY_TONES = { mains: "tomate", starters: "sauge", desserts: "prune", apero: "laiton", brunch: "abricot" } as const;

type Props = {
  draft: RecipeDraft;
  onChange: (draft: RecipeDraft, answer?: string) => void;
  sourceUrl: string | null;
  /** Photos mode: one more photo to clarify. */
  onMorePhoto?: (file: File) => void;
  refining: boolean;
  onSave: () => void;
  onEdit: () => void;
  saving: boolean;
  error: string | null;
};

/** One-tap answer button (≥ 48px hit area). */
function Choice({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap-target h-9 rounded-pill border-[1.5px] border-alerte-ink bg-surface px-3 text-small font-bold text-alerte-ink"
    >
      {children}
    </button>
  );
}

/**
 * "Voilà ta fiche": the draft, with unsure fields highlighted in yellow and the
 * AI's questions as one-tap answers. Everything else is ready to save.
 */
export function DraftReview({ draft, onChange, sourceUrl, onMorePhoto, refining, onSave, onEdit, saving, error }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const toCheck = pointsToCheck(draft);
  const total = (draft.prep_minutes.value ?? 0) + (draft.cook_minutes.value ?? 0);
  const timers = draft.steps.filter((s) => s.timer_minutes).map((s) => s.timer_minutes!);
  const unsure = (f: { confidence: string }) => f.confidence === "low";

  return (
    <div className="px-gutter pb-40">
      <h1 className="font-title text-h1">{a.reviewTitle}</h1>

      <p
        role="status"
        className={cx(
          "mt-4 flex items-start gap-3 rounded-card px-4 py-3.5 text-small font-semibold",
          toCheck ? "bg-alerte-soft text-alerte-ink" : "bg-succes-soft text-succes",
        )}
      >
        <Icon name={toCheck ? "alert" : "check"} className={toCheck ? "text-alerte" : undefined} />
        {toCheck === 0 ? a.reviewAllGood : toCheck === 1 ? a.reviewCheck : format(a.reviewChecks, { n: toCheck })}
      </p>
      {sourceUrl && (
        <p className="mt-2 text-small text-encre-3">{format(a.reviewSource, { host: new URL(sourceUrl).hostname.replace(/^www\./, "") })}</p>
      )}

      {draft.questions.length > 0 && (
        <section className="mt-5 space-y-3" aria-labelledby="questions-title">
          <h2 id="questions-title" className="text-h3">
            {a.questionsTitle}
          </h2>
          {draft.questions.map((q, i) => (
            <div key={`${q.field}-${i}`} className="rounded-card bg-alerte-soft p-4">
              <p className="font-semibold text-alerte-ink">{q.question}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {q.options.map((option) => (
                  <Choice key={option} onClick={() => onChange(answerQuestion(draft, q, option), `${q.question} ${option}`)}>
                    {option}
                  </Choice>
                ))}
              </div>
            </div>
          ))}
          {onMorePhoto && (
            <>
              <Button variant="secondary" icon="camera" block disabled={refining} onClick={() => fileInput.current?.click()}>
                {refining ? a.refining : a.morePhoto}
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                aria-label={a.morePhoto}
                className="sr-only"
                tabIndex={-1}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onMorePhoto(file);
                  e.target.value = "";
                }}
              />
            </>
          )}
        </section>
      )}

      {/* Title */}
      <div className="mt-5">
        <div className="mb-1 text-small font-semibold text-encre-3">{a.reviewTitleLabel}</div>
        <div className={cx("rounded-card border border-trait px-3.5 py-2.5 font-title text-h2 font-extrabold", unsure(draft.title) ? "bg-alerte-soft" : "bg-surface")}>
          {draft.title.value ?? a.noValue}
        </div>
        {unsure(draft.title) && draft.title.alternatives.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {draft.title.alternatives.map((alt) => (
              <Choice key={alt} onClick={() => onChange(chooseFieldValue(draft, "title", alt))}>
                {alt}
              </Choice>
            ))}
          </div>
        )}
      </div>

      {/* Category, time, servings, difficulty */}
      <div className="mt-3.5 flex flex-wrap gap-2">
        {draft.category_key && (
          <span className={cx("inline-flex h-8 items-center rounded-tag px-2.5 text-small font-semibold", categoryTint(CATEGORY_TONES[draft.category_key]))}>
            {t.notebook.categories[draft.category_key]}
          </span>
        )}
        {total > 0 && <InfoPill kind="time">{formatDuration(total)}</InfoPill>}
        {draft.servings.value != null && <InfoPill kind="servings">{format(a.servingsValue, { n: draft.servings.value })}</InfoPill>}
        {draft.difficulty.value != null && (
          <InfoPill kind="difficulty">{t.recipe.difficulty[draft.difficulty.value as 1 | 2 | 3]}</InfoPill>
        )}
      </div>
      {unsure(draft.servings) && !draft.questions.some((q) => q.field === "servings") && draft.servings.alternatives.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-card bg-alerte-soft p-3 text-small font-semibold text-alerte-ink">
          {t.recipe.parts} :
          {draft.servings.alternatives.map((n) => (
            <Choice key={n} onClick={() => onChange(chooseFieldValue(draft, "servings", n))}>
              {String(n)}
            </Choice>
          ))}
        </div>
      )}

      {/* Ingredients */}
      <h2 className="mt-6 mb-2 text-h2">{t.recipe.ingredients}</h2>
      <ul className="overflow-hidden rounded-card border border-trait bg-surface">
        {draft.ingredients.map((ing, index) => {
          const isUnsure = ing.confidence === "low";
          return (
            <li key={index} className={cx("flex flex-wrap items-center gap-2.5 border-b border-trait px-3.5 py-3 last:border-b-0", isUnsure && "bg-alerte-soft")}>
              <b className={cx("min-w-17", isUnsure && "underline decoration-alerte decoration-dashed underline-offset-4")}>
                {formatQuantity(ing.quantity, ing.unit) || "–"}
              </b>
              <span>{ing.name}</span>
              {isUnsure && ing.alternatives.length > 0 && (
                <div className="flex basis-full flex-wrap items-center gap-2 text-small font-semibold text-alerte-ink">
                  {a.unsureQuantity}
                  {ing.alternatives.map((alt, i) => (
                    <Choice key={i} onClick={() => onChange(chooseIngredientQuantity(draft, index, alt))}>
                      {formatQuantity(alt.quantity, alt.unit) || "–"}
                    </Choice>
                  ))}
                  <Choice onClick={onEdit}>{a.other}</Choice>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* Steps */}
      <h2 className="mt-6 mb-1 flex items-baseline justify-between text-h2">
        {t.recipe.steps}
        <small className="text-small font-medium text-encre-3">
          {format(a.stepsCount, { n: draft.steps.length })}
          {timers.length > 0 && `, ${format(a.timersFound, { n: timers[0] })}`}
        </small>
      </h2>
      <ol className="space-y-1">
        {draft.steps.map((step, i) => (
          <li key={i} className="grid grid-cols-[2rem_1fr] gap-2.5 py-1.5 text-small">
            <span aria-hidden="true" className="flex size-7 items-center justify-center rounded-[9px] bg-tomate-soft font-bold text-tomate-dark">
              {i + 1}
            </span>
            <span>{step.text}</span>
          </li>
        ))}
      </ol>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-trait bg-surface px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-[398px] space-y-2">
          {error && (
            <p role="alert" className="flex items-start gap-2 text-small font-semibold text-erreur">
              <Icon name="alert" size={18} />
              {error}
            </p>
          )}
          <Button icon="addbook" block disabled={saving || refining} onClick={onSave}>
            {saving ? a.saving : a.save}
          </Button>
          <Button variant="text" block disabled={saving} onClick={onEdit}>
            {a.edit}
          </Button>
        </div>
      </div>
    </div>
  );
}
