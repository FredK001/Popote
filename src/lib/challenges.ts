import { t } from "@/messages";

/** Monthly challenge: one seasonal theme per month, written in advance (messages). */
export type Challenge = { key: string; month: number; title: string; lead: string };

/** The challenge of the month for a date, in Paris time. Key "2026-10". */
export function challengeFor(date: Date = new Date()): Challenge {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit" }).formatToParts(date);
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return { key: `${year}-${month}`, month: Number(month), ...t.challenge.themes[Number(month) as keyof typeof t.challenge.themes] };
}
