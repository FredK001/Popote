import { format, t } from "@/messages";

/** 45 → "45 min", 70 → "1 h 10", 120 → "2 h". */
export function formatDuration(minutes: number | null | undefined): string | null {
  if (!minutes || minutes <= 0) return null;
  if (minutes < 60) return format(t.recipe.minutes, { n: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? format(t.recipe.hours, { h }) : format(t.recipe.hoursMinutes, { h, m: String(m).padStart(2, "0") });
}

export function formatServings(n: number): string {
  return n === 1 ? t.recipe.servingsOne : format(t.recipe.servings, { n });
}

/** 2:05 or 1:02:05 for timers. */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}
