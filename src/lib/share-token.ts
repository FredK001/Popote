/** Share tokens are base64url, 22+ chars. Anything else is rejected before hitting the database. */
export function isShareToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{22,64}$/.test(token);
}

/** "/r/{token}/ajouter": the pending action carried through sign-in (e-mail link, code or Google). */
export function claimPath(token: string): string {
  return `/r/${token}/ajouter`;
}

/** Extracts the token when a ?next= points to a claim. */
export function tokenFromClaimPath(path: string | null | undefined): string | null {
  const match = path?.match(/^\/r\/([A-Za-z0-9_-]{22,64})\/ajouter$/);
  return match ? match[1] : null;
}
