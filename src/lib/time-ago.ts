import { format, t } from "@/messages";

/** "12 minutes", "3 heures", "2 jours" — for "il y a …". */
export function timeAgo(iso: string, now = Date.now()): string {
  const minutes = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return t.time.now;
  if (minutes < 60) return minutes === 1 ? t.time.minute : format(t.time.minutes, { n: minutes });
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? t.time.hour : format(t.time.hours, { n: hours });
  const days = Math.round(hours / 24);
  return days === 1 ? t.time.day : format(t.time.days, { n: days });
}

/** "3 sept." */
export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(iso));
}
