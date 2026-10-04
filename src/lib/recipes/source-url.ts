const URL_IN_TEXT = /(https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/[^\s,;)]*)?)/i;

/**
 * The web page a recipe comes from: its source URL, or an address written in the
 * origin ("Konbini — konbini.com/food/…"), as AI assistants often put it there.
 * Must run on the raw text, before any length trimming.
 */
export function sourcePageUrl(sourceUrl: string | null | undefined, originLabel: string | null | undefined): string | null {
  if (sourceUrl && /^https?:\/\//.test(sourceUrl.trim())) return sourceUrl.trim();
  const match = originLabel?.match(URL_IN_TEXT);
  if (!match || !match[0].includes("/") && !match[1]) {
    // A bare domain ("marmiton.org") is not a page.
    return match && match[1] ? match[0] : null;
  }
  return match[1] ? match[0] : `https://${match[2]}`;
}

/** "La petite cuisine de Nat — lapetitecuisinedenat.com/2022/…" → "La petite cuisine de Nat". */
export function originWithoutUrl(originLabel: string | null | undefined): string | null {
  if (!originLabel) return null;
  const cleaned = originLabel
    .replace(URL_IN_TEXT, "")
    .replace(/[\s—–\-:|,(]+$/u, "")
    .replace(/^[\s—–\-:|,)]+/u, "")
    .trim();
  return cleaned || null;
}
