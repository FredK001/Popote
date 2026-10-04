import { fr } from "./fr";

/** Active locale. Only French for now. */
export const t = fr;

/** Replaces {key} placeholders in a message. */
export function format(message: string, values: Record<string, string | number>): string {
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}
