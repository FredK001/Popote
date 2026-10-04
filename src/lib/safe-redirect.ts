/** Keeps only same-site relative paths, to avoid open redirects through ?next=. */
export function safeNext(next: string | null | undefined, fallback = "/carnet"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
