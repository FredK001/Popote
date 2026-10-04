"use client";

import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";
import { formatClock } from "@/lib/recipes/format";
import { format, t } from "@/messages";

type Props = {
  seconds: number;
  remaining: number | null;
  onStart: () => void;
  onStop: () => void;
  large?: boolean;
};

/** Brass timer pill: "Lancer 25 min", then a live countdown that stops on tap. Text on brass is white. */
export function StepTimerButton({ seconds, remaining, onStart, onStop, large }: Props) {
  const running = remaining != null;
  return (
    <button
      type="button"
      onClick={running ? onStop : onStart}
      aria-label={running ? `${t.recipe.timerStop} (${formatClock(remaining)})` : undefined}
      className={cx(
        "inline-flex items-center gap-1.5 rounded-pill bg-laiton font-bold text-blanc tabular-nums",
        large ? "min-h-16 px-6 text-h2" : "mt-2.5 min-h-12 px-4 text-small",
      )}
    >
      <Icon name="timer" size={large ? 26 : 18} />
      {running ? formatClock(remaining) : format(t.recipe.startTimer, { n: Math.round(seconds / 60) })}
      {running && <Icon name="x" size={large ? 22 : 16} />}
    </button>
  );
}
